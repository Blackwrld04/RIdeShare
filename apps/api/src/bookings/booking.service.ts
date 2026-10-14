import { BookingStatus, Prisma, RideStatus } from "@commuteshare/database";
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

export interface BookingResponse {
  id: string;
  status: string;
  seats: number;
  unitContributionKobo: number;
  totalContributionKobo: number;
  currency: string;
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
    @Inject(DatabaseService) private readonly database: DatabaseService,
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
            select: { profile: { select: { displayName: true } } },
          });

          if (!passenger?.profile?.displayName) {
            throw new BadRequestException(
              "Complete your profile before booking a ride",
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

          const booking = await transaction.rideBooking.create({
            data: {
              rideOfferId: ride.id,
              passengerUserId: userId,
              seats: input.seats,
              unitContributionKobo: ride.contributionKobo,
              totalContributionKobo:
                ride.contributionKobo * BigInt(input.seats),
              currency: ride.currency,
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
