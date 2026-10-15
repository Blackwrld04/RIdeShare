import type { AppConfig } from "@commuteshare/config";
import {
  BookingStatus,
  Prisma,
  RefundKind,
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
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import { PaymentService } from "../payments/payment.service.js";
import { calculateSegmentContribution } from "../rides/ride.policy.js";
import {
  ACTIVE_BOOKING_STATUSES,
  calculateAvailableSeats,
} from "./booking.policy.js";
import type {
  CancelBookingInput,
  CreateBookingInput,
  DeclineBookingInput,
} from "./booking.schemas.js";

const bookingInclude = {
  passenger: {
    select: { profile: { select: { displayName: true } } },
  },
  rideOffer: {
    select: {
      id: true,
      status: true,
      departureAt: true,
      timezone: true,
      startedAt: true,
      completedAt: true,
      routePoints: { orderBy: { sequence: "asc" } },
      driverApplication: {
        select: {
          user: { select: { profile: { select: { displayName: true } } } },
          vehicle: {
            select: {
              make: true,
              model: true,
              color: true,
              year: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RideBookingInclude;

type BookingRecord = Prisma.RideBookingGetPayload<{
  include: typeof bookingInclude;
}>;

interface JourneyMatchRow {
  pickupLatitude: number;
  pickupLongitude: number;
  pickupRouteFraction: number;
  pickupDistanceMeters: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffRouteFraction: number;
  dropoffDistanceMeters: number;
}

export interface BookingResponse {
  id: string;
  status: string;
  seats: number;
  unitContributionKobo: number;
  totalContributionKobo: number;
  currency: string;
  journey: {
    pickup: {
      latitude: number;
      longitude: number;
      routeFraction: number;
      distanceToRouteMeters: number;
    };
    dropoff: {
      latitude: number;
      longitude: number;
      routeFraction: number;
      distanceToRouteMeters: number;
    };
    segmentDistanceMeters: number;
  } | null;
  passenger: {
    displayName: string | null;
  };
  ride: {
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
    startedAt: string | null;
    completedAt: string | null;
    route: Array<{
      sequence: number;
      kind: string;
      label: string;
      address: string | null;
      latitude: number;
      longitude: number;
    }>;
  };
  decidedAt: string | null;
  decisionReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BookingService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  async create(
    userId: string,
    input: CreateBookingInput,
  ): Promise<BookingResponse> {
    let bookingId: string;

    try {
      bookingId = await this.database.client.$transaction(
        async (transaction) => {
          await this.lockRide(transaction, input.rideId);
          const ride = await transaction.rideOffer.findUnique({
            where: { id: input.rideId },
            include: {
              bookings: {
                where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
                select: { seats: true, status: true },
              },
              driverApplication: { select: { userId: true } },
            },
          });

          if (!ride) {
            throw new NotFoundException("Ride offer not found");
          }
          if (ride.driverApplication.userId === userId) {
            throw new ForbiddenException("Drivers cannot book their own ride");
          }
          if (
            ride.status !== RideStatus.PUBLISHED ||
            ride.departureAt <= new Date()
          ) {
            throw new ConflictException("Ride is not accepting bookings");
          }

          const passenger = await transaction.user.findUnique({
            where: { id: userId },
            select: {
              profile: { select: { displayName: true, gender: true } },
            },
          });

          if (!passenger?.profile?.displayName) {
            throw new BadRequestException(
              "Complete your profile before booking a ride",
            );
          }
          if (ride.womenOnly && passenger.profile.gender !== "WOMAN") {
            throw new ForbiddenException(
              "This ride is available only to women",
            );
          }

          const existing = await transaction.rideBooking.findFirst({
            where: {
              rideOfferId: ride.id,
              passengerUserId: userId,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
            },
            select: { id: true },
          });

          if (existing) {
            throw new ConflictException(
              "An active booking already exists for this ride",
            );
          }

          const availableSeats = calculateAvailableSeats(
            ride.passengerSeats,
            ride.bookings,
          );

          if (input.seats > availableSeats) {
            throw new ConflictException(
              "Requested seats are no longer available",
            );
          }

          const journey = input.journey
            ? await this.matchJourney(
                transaction,
                ride.id,
                ride.routeDistanceMeters,
                input.journey,
              )
            : null;
          const unitContributionKobo = journey
            ? calculateSegmentContribution(
                Number(ride.contributionKobo),
                journey.pickupRouteFraction,
                journey.dropoffRouteFraction,
                this.config.MIN_SEGMENT_CONTRIBUTION_KOBO,
              )
            : Number(ride.contributionKobo);

          const booking = await transaction.rideBooking.create({
            data: {
              rideOfferId: ride.id,
              passengerUserId: userId,
              seats: input.seats,
              unitContributionKobo: BigInt(unitContributionKobo),
              totalContributionKobo:
                BigInt(unitContributionKobo) * BigInt(input.seats),
              currency: ride.currency,
              ...(journey
                ? {
                    pickupLatitude: journey.pickupLatitude,
                    pickupLongitude: journey.pickupLongitude,
                    pickupRouteFraction: journey.pickupRouteFraction,
                    pickupDistanceMeters: Math.round(
                      journey.pickupDistanceMeters,
                    ),
                    dropoffLatitude: journey.dropoffLatitude,
                    dropoffLongitude: journey.dropoffLongitude,
                    dropoffRouteFraction: journey.dropoffRouteFraction,
                    dropoffDistanceMeters: Math.round(
                      journey.dropoffDistanceMeters,
                    ),
                    segmentDistanceMeters: journey.segmentDistanceMeters,
                  }
                : {}),
            },
            select: { id: true },
          });

          if (input.seats === availableSeats) {
            await transaction.rideOffer.update({
              where: { id: ride.id },
              data: { status: RideStatus.FULL },
            });
          }

          return booking.id;
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "An active booking already exists for this ride",
        );
      }
      throw error;
    }

    return this.getBooking(bookingId);
  }

  async getMine(
    userId: string,
    statuses?: BookingStatus[],
  ): Promise<BookingResponse[]> {
    const bookings = await this.database.client.rideBooking.findMany({
      where: {
        passengerUserId: userId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return bookings.map((booking) => this.toResponse(booking));
  }

  async getForRide(userId: string, rideId: string): Promise<BookingResponse[]> {
    const ride = await this.database.client.rideOffer.findFirst({
      where: { id: rideId, driverApplication: { userId } },
      select: { id: true },
    });

    if (!ride) {
      throw new NotFoundException("Ride offer not found");
    }

    const bookings = await this.database.client.rideBooking.findMany({
      where: { rideOfferId: ride.id },
      include: bookingInclude,
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return bookings.map((booking) => this.toResponse(booking));
  }

  async confirm(userId: string, bookingId: string): Promise<BookingResponse> {
    await this.decide(userId, bookingId, BookingStatus.AWAITING_PAYMENT, null);
    return this.getBooking(bookingId);
  }

  async decline(
    userId: string,
    bookingId: string,
    input: DeclineBookingInput,
  ): Promise<BookingResponse> {
    await this.decide(userId, bookingId, BookingStatus.DECLINED, input.reason);
    return this.getBooking(bookingId);
  }

  async cancel(
    userId: string,
    bookingId: string,
    input: CancelBookingInput,
  ): Promise<BookingResponse> {
    await this.database.client.$transaction(async (transaction) => {
      const booking = await transaction.rideBooking.findFirst({
        where: { id: bookingId, passengerUserId: userId },
        select: { rideOfferId: true },
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      await this.lockRide(transaction, booking.rideOfferId);
      const cancelled = await transaction.rideBooking.updateMany({
        where: {
          id: bookingId,
          passengerUserId: userId,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: input.reason,
        },
      });

      if (cancelled.count !== 1) {
        throw new ConflictException("Booking cannot be cancelled");
      }

      await this.reopenRideIfSeatsAvailable(transaction, booking.rideOfferId);
    });

    await this.payments.refundBooking(
      bookingId,
      RefundKind.PASSENGER_CANCELLATION,
      input.reason,
    );

    return this.getBooking(bookingId);
  }

  private async decide(
    userId: string,
    bookingId: string,
    status: BookingStatus,
    reason: string | null,
  ): Promise<void> {
    await this.database.client.$transaction(async (transaction) => {
      const booking = await transaction.rideBooking.findUnique({
        where: { id: bookingId },
        select: { rideOfferId: true },
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      await this.lockRide(transaction, booking.rideOfferId);
      const ownedBooking = await transaction.rideBooking.findFirst({
        where: {
          id: bookingId,
          rideOffer: { driverApplication: { userId } },
        },
        select: { id: true },
      });

      if (!ownedBooking) {
        throw new NotFoundException("Booking not found");
      }

      const decided = await transaction.rideBooking.updateMany({
        where: { id: bookingId, status: BookingStatus.PENDING },
        data: {
          status,
          decidedAt: new Date(),
          decisionReason: reason,
        },
      });

      if (decided.count !== 1) {
        throw new ConflictException("Booking has already been decided");
      }

      if (status === BookingStatus.DECLINED) {
        await this.reopenRideIfSeatsAvailable(transaction, booking.rideOfferId);
      }
    });
  }

  private async reopenRideIfSeatsAvailable(
    transaction: Prisma.TransactionClient,
    rideId: string,
  ): Promise<void> {
    const ride = await transaction.rideOffer.findUnique({
      where: { id: rideId },
      include: {
        bookings: {
          where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
          select: { seats: true, status: true },
        },
      },
    });

    if (
      ride?.status === RideStatus.FULL &&
      ride.departureAt > new Date() &&
      calculateAvailableSeats(ride.passengerSeats, ride.bookings) > 0
    ) {
      await transaction.rideOffer.update({
        where: { id: ride.id },
        data: { status: RideStatus.PUBLISHED },
      });
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

  private async matchJourney(
    transaction: Prisma.TransactionClient,
    rideId: string,
    routeDistanceMeters: number | null,
    journey: NonNullable<CreateBookingInput["journey"]>,
  ): Promise<JourneyMatchRow & { segmentDistanceMeters: number }> {
    if (!routeDistanceMeters) {
      throw new BadRequestException("Ride does not have a routable corridor");
    }

    const matches = await transaction.$queryRaw<JourneyMatchRow[]>(Prisma.sql`
      WITH query_points AS (
        SELECT
          ST_SetSRID(
            ST_MakePoint(${journey.pickupLongitude}, ${journey.pickupLatitude}),
            4326
          ) AS pickup,
          ST_SetSRID(
            ST_MakePoint(${journey.dropoffLongitude}, ${journey.dropoffLatitude}),
            4326
          ) AS dropoff
      )
      SELECT
        ST_Y(ST_ClosestPoint(ride.route_corridor, query_points.pickup))
          AS "pickupLatitude",
        ST_X(ST_ClosestPoint(ride.route_corridor, query_points.pickup))
          AS "pickupLongitude",
        ST_LineLocatePoint(ride.route_corridor, query_points.pickup)
          AS "pickupRouteFraction",
        ST_Distance(
          ride.route_corridor::geography,
          query_points.pickup::geography
        ) AS "pickupDistanceMeters",
        ST_Y(ST_ClosestPoint(ride.route_corridor, query_points.dropoff))
          AS "dropoffLatitude",
        ST_X(ST_ClosestPoint(ride.route_corridor, query_points.dropoff))
          AS "dropoffLongitude",
        ST_LineLocatePoint(ride.route_corridor, query_points.dropoff)
          AS "dropoffRouteFraction",
        ST_Distance(
          ride.route_corridor::geography,
          query_points.dropoff::geography
        ) AS "dropoffDistanceMeters"
      FROM ride_offers AS ride
      CROSS JOIN query_points
      WHERE ride.id = ${rideId}::uuid
        AND ride.route_corridor IS NOT NULL
        AND ST_DWithin(
          ride.route_corridor::geography,
          query_points.pickup::geography,
          ${journey.corridorRadiusMeters}
        )
        AND ST_DWithin(
          ride.route_corridor::geography,
          query_points.dropoff::geography,
          ${journey.corridorRadiusMeters}
        )
        AND ST_LineLocatePoint(
          ride.route_corridor,
          query_points.pickup
        ) < ST_LineLocatePoint(
          ride.route_corridor,
          query_points.dropoff
        )
      LIMIT 1
    `);
    const match = matches[0];

    if (!match) {
      throw new BadRequestException(
        "Pickup and dropoff must follow the ride corridor",
      );
    }

    return {
      ...match,
      segmentDistanceMeters: Math.max(
        1,
        Math.round(
          routeDistanceMeters *
            (match.dropoffRouteFraction - match.pickupRouteFraction),
        ),
      ),
    };
  }

  private async getBooking(bookingId: string): Promise<BookingResponse> {
    const booking = await this.database.client.rideBooking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    return this.toResponse(booking);
  }

  private toResponse(booking: BookingRecord): BookingResponse {
    return {
      id: booking.id,
      status: booking.status,
      seats: booking.seats,
      unitContributionKobo: Number(booking.unitContributionKobo),
      totalContributionKobo: Number(booking.totalContributionKobo),
      currency: booking.currency,
      journey:
        booking.pickupLatitude !== null &&
        booking.pickupLongitude !== null &&
        booking.pickupRouteFraction !== null &&
        booking.pickupDistanceMeters !== null &&
        booking.dropoffLatitude !== null &&
        booking.dropoffLongitude !== null &&
        booking.dropoffRouteFraction !== null &&
        booking.dropoffDistanceMeters !== null &&
        booking.segmentDistanceMeters !== null
          ? {
              pickup: {
                latitude: Number(booking.pickupLatitude),
                longitude: Number(booking.pickupLongitude),
                routeFraction: Number(booking.pickupRouteFraction),
                distanceToRouteMeters: booking.pickupDistanceMeters,
              },
              dropoff: {
                latitude: Number(booking.dropoffLatitude),
                longitude: Number(booking.dropoffLongitude),
                routeFraction: Number(booking.dropoffRouteFraction),
                distanceToRouteMeters: booking.dropoffDistanceMeters,
              },
              segmentDistanceMeters: booking.segmentDistanceMeters,
            }
          : null,
      passenger: {
        displayName: booking.passenger.profile?.displayName ?? null,
      },
      ride: {
        id: booking.rideOffer.id,
        status: booking.rideOffer.status,
        driver: {
          displayName:
            booking.rideOffer.driverApplication.user.profile?.displayName ??
            null,
        },
        vehicle: booking.rideOffer.driverApplication.vehicle
          ? {
              make: booking.rideOffer.driverApplication.vehicle.make,
              model: booking.rideOffer.driverApplication.vehicle.model,
              color: booking.rideOffer.driverApplication.vehicle.color,
              year: booking.rideOffer.driverApplication.vehicle.year,
            }
          : null,
        departureAt: booking.rideOffer.departureAt.toISOString(),
        timezone: booking.rideOffer.timezone,
        startedAt: booking.rideOffer.startedAt?.toISOString() ?? null,
        completedAt: booking.rideOffer.completedAt?.toISOString() ?? null,
        route: booking.rideOffer.routePoints.map((point) => ({
          sequence: point.sequence,
          kind: point.kind,
          label: point.label,
          address: point.address,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
        })),
      },
      decidedAt: booking.decidedAt?.toISOString() ?? null,
      decisionReason: booking.decisionReason,
      startedAt: booking.startedAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }
}
