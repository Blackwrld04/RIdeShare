import {
  DriverApplicationStatus,
  type Prisma,
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
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  buildRoutePoints,
  getRidePublishIssues,
  type RoutePointData,
} from "./ride.policy.js";
import type {
  CancelRideInput,
  CreateRideInput,
  UpdateRideInput,
} from "./ride.schemas.js";

const rideInclude = {
  routePoints: { orderBy: { sequence: "asc" } },
  driverApplication: {
    select: {
      status: true,
      userId: true,
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
  contributionKobo: number;
  currency: string;
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
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RideService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async create(
    userId: string,
    input: CreateRideInput,
  ): Promise<RideOfferResponse> {
    const driver = await this.requireApprovedDriver(userId);
    this.assertSeatCapacity(input.passengerSeats, driver.vehicle.seatCapacity);
    const routePoints = buildRoutePoints(input.route).map((point) =>
      this.routePointData(point),
    );
    const ride = await this.database.client.rideOffer.create({
      data: {
        driverApplicationId: driver.id,
        departureAt: new Date(input.departureAt),
        timezone: input.timezone,
        passengerSeats: input.passengerSeats,
        contributionKobo: BigInt(input.contributionKobo),
        currency: input.currency,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        routePoints: { create: routePoints },
      },
      include: rideInclude,
    });

    return this.toResponse(ride);
  }

  async getMine(userId: string): Promise<RideOfferResponse[]> {
    const rides = await this.database.client.rideOffer.findMany({
      where: { driverApplication: { userId } },
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
        vehicleSeatCapacity:
          current.driverApplication.vehicle?.seatCapacity ?? null,
        routePoints: current.routePoints,
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
    const cancelled = await this.database.client.rideOffer.updateMany({
      where: {
        id: ride.id,
        status: {
          in: [RideStatus.DRAFT, RideStatus.PUBLISHED, RideStatus.FULL],
        },
      },
      data: {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
    });

    if (cancelled.count !== 1) {
      throw new ConflictException("Ride offer cannot be cancelled");
    }

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
      contributionKobo: Number(ride.contributionKobo),
      currency: ride.currency,
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
      cancelledAt: ride.cancelledAt?.toISOString() ?? null,
      cancellationReason: ride.cancellationReason,
      createdAt: ride.createdAt.toISOString(),
      updatedAt: ride.updatedAt.toISOString(),
    };
  }
}
