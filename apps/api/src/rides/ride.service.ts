import type { AppConfig } from "@commuteshare/config";
import {
  BookingStatus,
  DriverApplicationStatus,
  Prisma,
  RideStatus,
} from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ACTIVE_BOOKING_STATUSES,
  calculateAvailableSeats,
} from "../bookings/booking.policy.js";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import { PaymentService } from "../payments/payment.service.js";
import { canCompleteRide, canStartRide } from "../trips/trip.policy.js";
import {
  buildRoutePoints,
  calculateSegmentContribution,
  getRidePublishIssues,
  isRouteGeometryAligned,
  type RoutePointData,
} from "./ride.policy.js";
import type {
  CancelRideInput,
  CreateRideInput,
  SearchRidesInput,
  UpdateRideInput,
} from "./ride.schemas.js";

const rideInclude = {
  routePoints: { orderBy: { sequence: "asc" } },
  bookings: {
    where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    select: { seats: true, status: true },
  },
  driverApplication: {
    select: {
      status: true,
      userId: true,
      bankAccount: { select: { status: true } },
      user: { select: { profile: { select: { displayName: true } } } },
      vehicle: {
        select: {
          make: true,
          model: true,
          color: true,
          year: true,
          seatCapacity: true,
        },
      },
    },
  },
} satisfies Prisma.RideOfferInclude;

type RideOfferRecord = Prisma.RideOfferGetPayload<{
  include: typeof rideInclude;
}>;

type RideRouteMetadata = Pick<
  Prisma.RideOfferUncheckedCreateInput,
  | "routePath"
  | "routeDistanceMeters"
  | "routeDurationSeconds"
  | "routingSource"
  | "routingProfile"
>;

export interface RideOfferResponse {
  id: string;
  status: string;
  driver: {
    displayName: string | null;
  };
  vehicle: {
    make: string;
    model: string;
    color: string;
    year: number;
  } | null;
  departureAt: string;
  timezone: string;
  passengerSeats: number;
  availableSeats: number;
  contributionKobo: number;
  currency: string;
  routePath: Array<{ latitude: number; longitude: number }>;
  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;
  routingSource: string | null;
  routingProfile: string | null;
  notes: string | null;
  route: Array<{
    id: string;
    sequence: number;
    kind: string;
    label: string;
    address: string | null;
    latitude: number;
    longitude: number;
    externalSource: string | null;
    externalId: string | null;
  }>;
  publishedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RideSearchResult = RideOfferResponse & {
  originDistanceMeters: number;
  destinationDistanceMeters: number;
  pickup: {
    latitude: number;
    longitude: number;
    routeFraction: number;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    routeFraction: number;
  };
  segmentDistanceMeters: number;
  segmentContributionKobo: number;
};

interface RideSearchRow {
  id: string;
  originDistanceMeters: number;
  destinationDistanceMeters: number;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupRouteFraction: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffRouteFraction: number;
}

@Injectable()
export class RideService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  async create(
    userId: string,
    input: CreateRideInput,
  ): Promise<RideOfferResponse> {
    const driver = await this.requireApprovedDriver(userId);
    this.assertSeatCapacity(input.passengerSeats, driver.vehicle.seatCapacity);
    this.assertRouteGeometry(input.route);
    const routePoints = buildRoutePoints(input.route).map((point) =>
      this.routePointData(point),
    );
    const rideId = await this.database.client.$transaction(
      async (transaction) => {
        const ride = await transaction.rideOffer.create({
          data: {
            driverApplicationId: driver.id,
            departureAt: new Date(input.departureAt),
            timezone: input.timezone,
            passengerSeats: input.passengerSeats,
            contributionKobo: BigInt(input.contributionKobo),
            currency: input.currency,
            ...this.routeMetadata(input.route),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            routePoints: { create: routePoints },
          },
          select: { id: true },
        });
        await this.syncRouteCorridor(transaction, ride.id, input.route.path);
        return ride.id;
      },
    );

    return this.get(userId, rideId);
  }

  async getMine(
    userId: string,
    statuses?: RideStatus[],
  ): Promise<RideOfferResponse[]> {
    const rides = await this.database.client.rideOffer.findMany({
      where: {
        driverApplication: { userId },
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: rideInclude,
      orderBy: { departureAt: "desc" },
      take: 50,
    });
    return rides.map((ride) => this.toResponse(ride));
  }

  async get(userId: string, rideId: string): Promise<RideOfferResponse> {
    const ride = await this.database.client.rideOffer.findUnique({
      where: { id: rideId },
      include: rideInclude,
    });

    if (!ride || !this.canView(userId, ride)) {
      throw new NotFoundException("Ride offer not found");
    }

    return this.toResponse(ride);
  }

  async search(input: SearchRidesInput): Promise<RideSearchResult[]> {
    const departureFrom = input.departureFrom
      ? new Date(input.departureFrom)
      : new Date();
    const departureTo = input.departureTo
      ? new Date(input.departureTo)
      : new Date(departureFrom.getTime() + 24 * 60 * 60 * 1_000);

    if (departureTo <= departureFrom) {
      throw new BadRequestException(
        "Departure end must be after departure start",
      );
    }

    if (
      departureTo.getTime() - departureFrom.getTime() >
      7 * 24 * 60 * 60 * 1_000
    ) {
      throw new BadRequestException(
        "Ride search window cannot exceed seven days",
      );
    }

    const matches = await this.database.client.$queryRaw<RideSearchRow[]>(
      Prisma.sql`
        WITH query_points AS (
          SELECT
            ST_SetSRID(
              ST_MakePoint(${input.originLongitude}, ${input.originLatitude}),
              4326
            ) AS origin,
            ST_SetSRID(
              ST_MakePoint(
                ${input.destinationLongitude},
                ${input.destinationLatitude}
              ),
              4326
            ) AS destination
        ),
        matching_rides AS (
          SELECT
            ride.id,
            ride.departure_at AS "departureAt",
            ST_Distance(
              ride.route_corridor::geography,
              query_points.origin::geography
            ) AS "originDistanceMeters",
            ST_Distance(
              ride.route_corridor::geography,
              query_points.destination::geography
            ) AS "destinationDistanceMeters",
            ST_Y(
              ST_ClosestPoint(ride.route_corridor, query_points.origin)
            ) AS "pickupLatitude",
            ST_X(
              ST_ClosestPoint(ride.route_corridor, query_points.origin)
            ) AS "pickupLongitude",
            ST_LineLocatePoint(
              ride.route_corridor,
              query_points.origin
            ) AS "pickupRouteFraction",
            ST_Y(
              ST_ClosestPoint(ride.route_corridor, query_points.destination)
            ) AS "dropoffLatitude",
            ST_X(
              ST_ClosestPoint(ride.route_corridor, query_points.destination)
            ) AS "dropoffLongitude",
            ST_LineLocatePoint(
              ride.route_corridor,
              query_points.destination
            ) AS "dropoffRouteFraction"
          FROM ride_offers AS ride
          CROSS JOIN query_points
          LEFT JOIN (
            SELECT ride_offer_id, SUM(seats) AS reserved_seats
            FROM ride_bookings
            WHERE status IN (
              'PENDING'::booking_status,
              'AWAITING_PAYMENT'::booking_status,
              'CONFIRMED'::booking_status
            )
            GROUP BY ride_offer_id
          ) AS reservations
            ON reservations.ride_offer_id = ride.id
          WHERE ride.status = 'PUBLISHED'::ride_status
            AND ride.route_corridor IS NOT NULL
            AND ride.route_distance_meters IS NOT NULL
            AND ride.departure_at >= ${departureFrom}
            AND ride.departure_at <= ${departureTo}
            AND ride.passenger_seats - COALESCE(
              reservations.reserved_seats,
              0
            ) >= ${input.seats}
            AND ST_DWithin(
              ride.route_corridor::geography,
              query_points.origin::geography,
              ${input.radiusMeters}
            )
            AND ST_DWithin(
              ride.route_corridor::geography,
              query_points.destination::geography,
              ${input.radiusMeters}
            )
            AND ST_LineLocatePoint(
              ride.route_corridor,
              query_points.origin
            ) < ST_LineLocatePoint(
              ride.route_corridor,
              query_points.destination
            )
        )
        SELECT
          id,
          "originDistanceMeters",
          "destinationDistanceMeters",
          "pickupLatitude",
          "pickupLongitude",
          "pickupRouteFraction",
          "dropoffLatitude",
          "dropoffLongitude",
          "dropoffRouteFraction"
        FROM matching_rides
        ORDER BY
          "departureAt" ASC,
          "originDistanceMeters" + "destinationDistanceMeters" ASC
        LIMIT ${input.limit}
      `,
    );

    if (matches.length === 0) {
      return [];
    }

    const rides = await this.database.client.rideOffer.findMany({
      where: { id: { in: matches.map((match) => match.id) } },
      include: rideInclude,
    });
    const ridesById = new Map(rides.map((ride) => [ride.id, ride]));

    return matches.flatMap((match) => {
      const ride = ridesById.get(match.id);

      return ride
        ? [
            {
              ...this.toResponse(ride),
              originDistanceMeters: Math.round(match.originDistanceMeters),
              destinationDistanceMeters: Math.round(
                match.destinationDistanceMeters,
              ),
              pickup: {
                latitude: match.pickupLatitude,
                longitude: match.pickupLongitude,
                routeFraction: match.pickupRouteFraction,
              },
              dropoff: {
                latitude: match.dropoffLatitude,
                longitude: match.dropoffLongitude,
                routeFraction: match.dropoffRouteFraction,
              },
              segmentDistanceMeters: this.segmentDistance(
                ride.routeDistanceMeters,
                match.pickupRouteFraction,
                match.dropoffRouteFraction,
              ),
              segmentContributionKobo: calculateSegmentContribution(
                Number(ride.contributionKobo),
                match.pickupRouteFraction,
                match.dropoffRouteFraction,
                this.config.MIN_SEGMENT_CONTRIBUTION_KOBO,
              ),
            },
          ]
        : [];
    });
  }

  async update(
    userId: string,
    rideId: string,
    input: UpdateRideInput,
  ): Promise<RideOfferResponse> {
    const ride = await this.requireOwnedRide(userId, rideId);
    this.assertDraft(ride.status);
    this.assertDriverApproved(ride.driverApplication.status);
    this.assertSeatCapacity(
      input.passengerSeats ?? ride.passengerSeats,
      ride.driverApplication.vehicle?.seatCapacity ?? null,
    );
    if (input.route) {
      this.assertRouteGeometry(input.route);
    }
    const data: Prisma.RideOfferUpdateInput = {};

    if (input.departureAt !== undefined) {
      data.departureAt = new Date(input.departureAt);
    }
    if (input.timezone !== undefined) {
      data.timezone = input.timezone;
    }
    if (input.passengerSeats !== undefined) {
      data.passengerSeats = input.passengerSeats;
    }
    if (input.contributionKobo !== undefined) {
      data.contributionKobo = BigInt(input.contributionKobo);
    }
    if (input.notes !== undefined) {
      data.notes = input.notes;
    }
    if (input.route) {
      Object.assign(data, this.routeMetadata(input.route, true));
    }

    await this.database.client.$transaction(async (transaction) => {
      await this.claimDraft(transaction, ride.id);

      if (Object.keys(data).length > 0) {
        await transaction.rideOffer.update({
          where: { id: ride.id },
          data,
        });
      }

      if (input.route) {
        await transaction.rideRoutePoint.deleteMany({
          where: { rideOfferId: ride.id },
        });
        await transaction.rideRoutePoint.createMany({
          data: buildRoutePoints(input.route).map((point) => ({
            rideOfferId: ride.id,
            ...this.routePointData(point),
          })),
        });
        await this.syncRouteCorridor(transaction, ride.id, input.route.path);
      }
    });

    return this.get(userId, rideId);
  }

  async publish(userId: string, rideId: string): Promise<RideOfferResponse> {
    const ride = await this.requireOwnedRide(userId, rideId);
    this.assertDraft(ride.status);

    await this.database.client.$transaction(async (transaction) => {
      await this.claimDraft(transaction, ride.id);
      const current = await transaction.rideOffer.findUnique({
        where: { id: ride.id },
        include: rideInclude,
      });

      if (!current) {
        throw new NotFoundException("Ride offer not found");
      }

      const issues = getRidePublishIssues({
        departureAt: current.departureAt,
        passengerSeats: current.passengerSeats,
        driverStatus: current.driverApplication.status,
        bankAccountStatus:
          current.driverApplication.bankAccount?.status ?? null,
        vehicleSeatCapacity:
          current.driverApplication.vehicle?.seatCapacity ?? null,
        routePoints: current.routePoints,
        routePathPointCount: this.routePath(current.routePath).length,
        routeDistanceMeters: current.routeDistanceMeters,
        routeDurationSeconds: current.routeDurationSeconds,
      });

      if (issues.length > 0) {
        throw new BadRequestException({
          code: "RIDE_OFFER_NOT_PUBLISHABLE",
          message: "Ride offer is not publishable",
          requirements: issues,
        });
      }

      await transaction.rideOffer.update({
        where: { id: current.id },
        data: { status: RideStatus.PUBLISHED, publishedAt: new Date() },
      });
    });

    return this.get(userId, rideId);
  }

  async cancel(
    userId: string,
    rideId: string,
    input: CancelRideInput,
  ): Promise<RideOfferResponse> {
    const ride = await this.requireOwnedRide(userId, rideId);
    await this.database.client.$transaction(async (transaction) => {
      await this.lockRide(transaction, ride.id);
      const cancelledAt = new Date();
      const cancelled = await transaction.rideOffer.updateMany({
        where: {
          id: ride.id,
          driverApplication: { userId },
          status: {
            in: [RideStatus.DRAFT, RideStatus.PUBLISHED, RideStatus.FULL],
          },
        },
        data: {
          status: RideStatus.CANCELLED,
          cancelledAt,
          cancellationReason: input.reason,
        },
      });

      if (cancelled.count !== 1) {
        throw new ConflictException("Ride offer cannot be cancelled");
      }

      await transaction.rideBooking.updateMany({
        where: {
          rideOfferId: ride.id,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt,
          cancellationReason: input.reason,
        },
      });
    });

    await this.payments.refundRideBookings(ride.id, input.reason);

    return this.get(userId, rideId);
  }

  async start(userId: string, rideId: string): Promise<RideOfferResponse> {
    const ride = await this.requireOwnedRide(userId, rideId);

    if (!canStartRide(ride.status)) {
      throw new ConflictException("Ride cannot be started");
    }

    await this.database.client.$transaction(async (transaction) => {
      await this.lockRide(transaction, ride.id);
      const startedAt = new Date();
      const started = await transaction.rideOffer.updateMany({
        where: {
          id: ride.id,
          driverApplication: { userId },
          status: { in: [RideStatus.PUBLISHED, RideStatus.FULL] },
        },
        data: { status: RideStatus.IN_PROGRESS, startedAt },
      });

      if (started.count !== 1) {
        throw new ConflictException("Ride cannot be started");
      }

      await transaction.rideBooking.updateMany({
        where: {
          rideOfferId: ride.id,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT],
          },
        },
        data: {
          status: BookingStatus.EXPIRED,
          decidedAt: startedAt,
          decisionReason: "Ride started before confirmation",
        },
      });
      await transaction.rideBooking.updateMany({
        where: {
          rideOfferId: ride.id,
          status: BookingStatus.CONFIRMED,
        },
        data: { status: BookingStatus.IN_PROGRESS, startedAt },
      });
    });

    return this.get(userId, rideId);
  }

  async complete(userId: string, rideId: string): Promise<RideOfferResponse> {
    const ride = await this.requireOwnedRide(userId, rideId);

    if (!canCompleteRide(ride.status)) {
      throw new ConflictException("Ride cannot be completed");
    }

    const payout = await this.database.client.$transaction(
      async (transaction) => {
        await this.lockRide(transaction, ride.id);
        const completedAt = new Date();
        const completed = await transaction.rideOffer.updateMany({
          where: {
            id: ride.id,
            driverApplication: { userId },
            status: RideStatus.IN_PROGRESS,
          },
          data: { status: RideStatus.COMPLETED, completedAt },
        });

        if (completed.count !== 1) {
          throw new ConflictException("Ride cannot be completed");
        }

        await transaction.rideBooking.updateMany({
          where: {
            rideOfferId: ride.id,
            status: BookingStatus.IN_PROGRESS,
          },
          data: { status: BookingStatus.COMPLETED, completedAt },
        });
        await this.payments.settleRideBookings(transaction, ride.id);
        return this.payments.scheduleRidePayout(
          transaction,
          ride.id,
          completedAt,
        );
      },
    );

    await this.payments.enqueuePayout(payout);

    return this.get(userId, rideId);
  }

  private async requireApprovedDriver(userId: string) {
    const driver = await this.database.client.driverApplication.findUnique({
      where: { userId },
      include: { vehicle: true },
    });

    if (!driver || driver.status !== DriverApplicationStatus.APPROVED) {
      throw new ForbiddenException("Approved driver account required");
    }

    if (!driver.vehicle) {
      throw new BadRequestException("Approved vehicle required");
    }

    return { ...driver, vehicle: driver.vehicle };
  }

  private async requireOwnedRide(
    userId: string,
    rideId: string,
  ): Promise<RideOfferRecord> {
    const ride = await this.database.client.rideOffer.findFirst({
      where: { id: rideId, driverApplication: { userId } },
      include: rideInclude,
    });

    if (!ride) {
      throw new NotFoundException("Ride offer not found");
    }

    return ride;
  }

  private async claimDraft(
    transaction: Prisma.TransactionClient,
    rideId: string,
  ): Promise<void> {
    const claimed = await transaction.rideOffer.updateMany({
      where: { id: rideId, status: RideStatus.DRAFT },
      data: { status: RideStatus.DRAFT },
    });

    if (claimed.count !== 1) {
      throw new ConflictException("Ride offer is no longer editable");
    }
  }

  private async lockRide(
    transaction: Prisma.TransactionClient,
    rideId: string,
  ): Promise<void> {
    await transaction.$queryRaw(
      Prisma.sql`SELECT id FROM ride_offers WHERE id = ${rideId} FOR UPDATE`,
    );
  }

  private assertDraft(status: RideStatus): void {
    if (status !== RideStatus.DRAFT) {
      throw new ConflictException("Only draft ride offers can be edited");
    }
  }

  private assertDriverApproved(status: DriverApplicationStatus): void {
    if (status !== DriverApplicationStatus.APPROVED) {
      throw new ForbiddenException("Approved driver account required");
    }
  }

  private assertSeatCapacity(
    passengerSeats: number,
    vehicleSeatCapacity: number | null,
  ): void {
    if (
      vehicleSeatCapacity === null ||
      passengerSeats > vehicleSeatCapacity - 1
    ) {
      throw new BadRequestException(
        "Passenger seats exceed approved vehicle capacity",
      );
    }
  }

  private assertRouteGeometry(route: CreateRideInput["route"]): void {
    if (!isRouteGeometryAligned(route)) {
      throw new BadRequestException(
        "Route path must follow the supplied origin, waypoints, and destination",
      );
    }
  }

  private canView(userId: string, ride: RideOfferRecord): boolean {
    if (ride.driverApplication.userId === userId) {
      return true;
    }

    return (
      ride.status === RideStatus.PUBLISHED ||
      ride.status === RideStatus.FULL ||
      ride.status === RideStatus.IN_PROGRESS ||
      ride.status === RideStatus.COMPLETED
    );
  }

  private routePointData(point: RoutePointData) {
    return {
      sequence: point.sequence,
      kind: point.kind,
      label: point.label,
      ...(point.address !== undefined ? { address: point.address } : {}),
      latitude: point.latitude,
      longitude: point.longitude,
      ...(point.externalSource !== undefined
        ? { externalSource: point.externalSource }
        : {}),
      ...(point.externalId !== undefined
        ? { externalId: point.externalId }
        : {}),
    };
  }

  private routeMetadata(
    route: CreateRideInput["route"],
    clearMissing = false,
  ): RideRouteMetadata {
    if (
      !route.path ||
      route.distanceMeters === undefined ||
      route.durationSeconds === undefined
    ) {
      return clearMissing
        ? {
            routePath: Prisma.DbNull,
            routeDistanceMeters: null,
            routeDurationSeconds: null,
            routingSource: null,
            routingProfile: null,
          }
        : {};
    }

    return {
      routePath: route.path as Prisma.InputJsonValue,
      routeDistanceMeters: route.distanceMeters,
      routeDurationSeconds: route.durationSeconds,
      routingSource: route.routingSource ?? null,
      routingProfile: route.routingProfile ?? null,
    };
  }

  private async syncRouteCorridor(
    transaction: Prisma.TransactionClient,
    rideId: string,
    path: CreateRideInput["route"]["path"],
  ): Promise<void> {
    if (!path) {
      await transaction.$executeRaw(
        Prisma.sql`UPDATE ride_offers SET route_corridor = NULL WHERE id = ${rideId}::uuid`,
      );
      return;
    }

    const geoJson = JSON.stringify({
      type: "LineString",
      coordinates: path.map((point) => [point.longitude, point.latitude]),
    });
    await transaction.$executeRaw(
      Prisma.sql`
        UPDATE ride_offers
        SET route_corridor = ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326)
        WHERE id = ${rideId}::uuid
      `,
    );
  }

  private routePath(
    value: Prisma.JsonValue | null,
  ): Array<{ latitude: number; longitude: number }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((point) => {
      if (
        typeof point !== "object" ||
        point === null ||
        Array.isArray(point) ||
        typeof point.latitude !== "number" ||
        typeof point.longitude !== "number"
      ) {
        return [];
      }

      return [{ latitude: point.latitude, longitude: point.longitude }];
    });
  }

  private segmentDistance(
    routeDistanceMeters: number | null,
    pickupRouteFraction: number,
    dropoffRouteFraction: number,
  ): number {
    return Math.max(
      1,
      Math.round(
        (routeDistanceMeters ?? 0) *
          (dropoffRouteFraction - pickupRouteFraction),
      ),
    );
  }

  private toResponse(ride: RideOfferRecord): RideOfferResponse {
    return {
      id: ride.id,
      status: ride.status,
      driver: {
        displayName: ride.driverApplication.user.profile?.displayName ?? null,
      },
      vehicle: ride.driverApplication.vehicle
        ? {
            make: ride.driverApplication.vehicle.make,
            model: ride.driverApplication.vehicle.model,
            color: ride.driverApplication.vehicle.color,
            year: ride.driverApplication.vehicle.year,
          }
        : null,
      departureAt: ride.departureAt.toISOString(),
      timezone: ride.timezone,
      passengerSeats: ride.passengerSeats,
      availableSeats:
        ride.status === RideStatus.IN_PROGRESS ||
        ride.status === RideStatus.COMPLETED ||
        ride.status === RideStatus.CANCELLED
          ? 0
          : calculateAvailableSeats(ride.passengerSeats, ride.bookings),
      contributionKobo: Number(ride.contributionKobo),
      currency: ride.currency,
      routePath: this.routePath(ride.routePath),
      routeDistanceMeters: ride.routeDistanceMeters,
      routeDurationSeconds: ride.routeDurationSeconds,
      routingSource: ride.routingSource,
      routingProfile: ride.routingProfile,
      notes: ride.notes,
      route: ride.routePoints.map((point) => ({
        id: point.id,
        sequence: point.sequence,
        kind: point.kind,
        label: point.label,
        address: point.address,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        externalSource: point.externalSource,
        externalId: point.externalId,
      })),
      publishedAt: ride.publishedAt?.toISOString() ?? null,
      startedAt: ride.startedAt?.toISOString() ?? null,
      completedAt: ride.completedAt?.toISOString() ?? null,
      cancelledAt: ride.cancelledAt?.toISOString() ?? null,
      cancellationReason: ride.cancellationReason,
      createdAt: ride.createdAt.toISOString(),
      updatedAt: ride.updatedAt.toISOString(),
    };
  }
}
