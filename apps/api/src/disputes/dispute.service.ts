import {
  BookingStatus,
  PaymentDisputeStatus,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  RefundKind,
} from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import { PaymentService } from "../payments/payment.service.js";
import type {
  CreateDisputeInput,
  ListDisputesInput,
  ResolveDisputeInput,
} from "./dispute.schemas.js";

const disputeSelect = {
  id: true,
  bookingId: true,
  status: true,
  reason: true,
  resolutionNote: true,
  openedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  openedBy: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
  reviewedBy: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
  booking: {
    select: {
      passengerUserId: true,
      rideOffer: {
        select: {
          id: true,
          departureAt: true,
          driverApplication: { select: { userId: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentDisputeSelect;

type DisputeRecord = Prisma.PaymentDisputeGetPayload<{
  select: typeof disputeSelect;
}>;

export interface PaymentDisputeResponse {
  id: string;
  bookingId: string;
  ride: { id: string; departureAt: string };
  openedBy: { userId: string; displayName: string | null };
  status: string;
  reason: string;
  resolutionNote: string | null;
  openedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentDisputeResponse extends PaymentDisputeResponse {
  reviewedBy: { userId: string; displayName: string | null } | null;
}

export interface PaymentDisputePageResponse<T> {
  items: T[];
  nextCursor: string | null;
}

@Injectable()
export class DisputeService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  async create(
    userId: string,
    bookingId: string,
    input: CreateDisputeInput,
  ): Promise<PaymentDisputeResponse> {
    const now = new Date();
    let payoutId: string | null = null;
    try {
      const disputeId = await this.database.client.$transaction(
        async (transaction) => {
          const reference = await transaction.rideBooking.findFirst({
            where: { id: bookingId, passengerUserId: userId },
            select: { rideOfferId: true },
          });
          if (!reference) {
            throw new NotFoundException("Booking not found");
          }
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM ride_offers WHERE id = ${reference.rideOfferId}::uuid FOR UPDATE`,
          );
          const booking = await transaction.rideBooking.findFirst({
            where: { id: bookingId, passengerUserId: userId },
            include: {
              payments: {
                where: { status: PaymentStatus.SUCCEEDED },
                take: 1,
              },
              rideOffer: {
                include: {
                  payout: true,
                  driverApplication: { select: { userId: true } },
                },
              },
            },
          });
          if (!booking) {
            throw new NotFoundException("Booking not found");
          }
          if (
            booking.status !== BookingStatus.COMPLETED ||
            !booking.completedAt
          ) {
            throw new ConflictException(
              "Only completed paid bookings can be disputed",
            );
          }
          if (
            booking.completedAt.getTime() + 24 * 60 * 60 * 1_000 <
            now.getTime()
          ) {
            throw new ConflictException("The dispute window has closed");
          }
          if (booking.payments.length === 0) {
            throw new ConflictException(
              "Only completed paid bookings can be disputed",
            );
          }
          const payout = booking.rideOffer.payout;
          if (
            !payout ||
            (payout.status !== PayoutStatus.SCHEDULED &&
              payout.status !== PayoutStatus.ON_HOLD)
          ) {
            throw new ConflictException("The payout can no longer be disputed");
          }
          const dispute = await transaction.paymentDispute.create({
            data: { bookingId, openedByUserId: userId, reason: input.reason },
            select: { id: true },
          });
          await transaction.rideBooking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.DISPUTED,
              decisionReason: "Payment dispute opened",
            },
          });
          await transaction.driverPayout.update({
            where: { id: payout.id },
            data: {
              status: PayoutStatus.ON_HOLD,
              providerMessage: "Payout held for payment dispute",
            },
          });
          await transaction.userNotification.create({
            data: {
              userId: booking.rideOffer.driverApplication.userId,
              kind: "payment_dispute_opened",
              title: "Ride payout under review",
              body: "A completed booking was disputed before payout",
              data: {
                disputeId: dispute.id,
                bookingId,
                rideId: reference.rideOfferId,
              },
              idempotencyKey: `payment-dispute:${dispute.id}:opened:driver`,
            },
          });
          payoutId = payout.id;
          return dispute.id;
        },
      );
      if (payoutId) {
        await this.payments.removePayoutJob(payoutId);
      }
      return this.getOwned(userId, disputeId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("This booking already has a dispute");
      }
      throw error;
    }
  }

  async listMine(
    userId: string,
    input: ListDisputesInput,
  ): Promise<PaymentDisputePageResponse<PaymentDisputeResponse>> {
    const page = await this.list({ openedByUserId: userId }, input);
    return {
      items: page.items.map((item) => this.toUserResponse(item)),
      nextCursor: page.nextCursor,
    };
  }

  async listAdmin(
    input: ListDisputesInput,
  ): Promise<PaymentDisputePageResponse<AdminPaymentDisputeResponse>> {
    const page = await this.list({}, input);
    return {
      items: page.items.map((item) => this.toAdminResponse(item)),
      nextCursor: page.nextCursor,
    };
  }

  async getAdmin(disputeId: string): Promise<AdminPaymentDisputeResponse> {
    const dispute = await this.database.client.paymentDispute.findUnique({
      where: { id: disputeId },
      select: disputeSelect,
    });
    if (!dispute) {
      throw new NotFoundException("Payment dispute not found");
    }
    return this.toAdminResponse(dispute);
  }

  async resolve(
    reviewerUserId: string,
    disputeId: string,
    input: ResolveDisputeInput,
  ): Promise<AdminPaymentDisputeResponse> {
    const dispute = await this.database.client.paymentDispute.findUnique({
      where: { id: disputeId },
      select: {
        id: true,
        bookingId: true,
        status: true,
        booking: { select: { rideOfferId: true } },
      },
    });
    if (!dispute) {
      throw new NotFoundException("Payment dispute not found");
    }
    if (dispute.status !== PaymentDisputeStatus.OPEN) {
      throw new ConflictException("Payment dispute has already been resolved");
    }
    if (input.action === "refund") {
      await this.payments.refundBooking(
        dispute.bookingId,
        RefundKind.DISPUTE_RESOLUTION,
        input.note,
      );
    }
    const status =
      input.action === "refund"
        ? PaymentDisputeStatus.REFUNDED
        : PaymentDisputeStatus.RELEASED;
    const bookingStatus =
      input.action === "refund"
        ? BookingStatus.CANCELLED
        : BookingStatus.COMPLETED;
    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM payment_disputes WHERE id = ${disputeId}::uuid FOR UPDATE`,
      );
      const updated = await transaction.paymentDispute.updateMany({
        where: { id: disputeId, status: PaymentDisputeStatus.OPEN },
        data: {
          status,
          resolutionNote: input.note,
          reviewedByUserId: reviewerUserId,
          resolvedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException("Payment dispute status changed");
      }
      await transaction.rideBooking.update({
        where: { id: dispute.bookingId },
        data: {
          status: bookingStatus,
          decisionReason:
            input.action === "refund"
              ? "Payment dispute refunded"
              : "Payment dispute released",
          ...(input.action === "refund"
            ? { cancelledAt: new Date(), cancellationReason: input.note }
            : {}),
        },
      });
      const owner = await transaction.paymentDispute.findUniqueOrThrow({
        where: { id: disputeId },
        select: { openedByUserId: true },
      });
      await transaction.userNotification.create({
        data: {
          userId: owner.openedByUserId,
          kind: "payment_dispute_resolved",
          title: "Payment dispute resolved",
          body:
            input.action === "refund"
              ? "Your disputed payment is being refunded"
              : "Your dispute was reviewed and the payout was released",
          data: {
            disputeId,
            bookingId: dispute.bookingId,
            action: input.action,
          },
          idempotencyKey: `payment-dispute:${disputeId}:resolved:${input.action}`,
        },
      });
    });
    await this.payments.releaseHeldPayout(dispute.booking.rideOfferId);
    return this.getAdmin(disputeId);
  }

  private async getOwned(
    userId: string,
    disputeId: string,
  ): Promise<PaymentDisputeResponse> {
    const dispute = await this.database.client.paymentDispute.findFirst({
      where: { id: disputeId, openedByUserId: userId },
      select: disputeSelect,
    });
    if (!dispute) {
      throw new NotFoundException("Payment dispute not found");
    }
    return this.toUserResponse(dispute);
  }

  private async list(
    scope: { openedByUserId?: string },
    input: ListDisputesInput,
  ): Promise<{ items: DisputeRecord[]; nextCursor: string | null }> {
    const where = {
      ...scope,
      ...(input.status ? { status: input.status } : {}),
    } satisfies Prisma.PaymentDisputeWhereInput;
    const cursor = input.cursor
      ? await this.database.client.paymentDispute.findFirst({
          where: { ...where, id: input.cursor },
          select: { id: true, openedAt: true },
        })
      : null;
    if (input.cursor && !cursor) {
      throw new BadRequestException("Payment dispute cursor is invalid");
    }
    const items = await this.database.client.paymentDispute.findMany({
      where: {
        ...where,
        ...(cursor
          ? {
              OR: [
                { openedAt: { lt: cursor.openedAt } },
                { openedAt: cursor.openedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: disputeSelect,
      orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
    });
    const hasMore = items.length > input.limit;
    const page = hasMore ? items.slice(0, input.limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toUserResponse(dispute: DisputeRecord): PaymentDisputeResponse {
    return {
      id: dispute.id,
      bookingId: dispute.bookingId,
      ride: {
        id: dispute.booking.rideOffer.id,
        departureAt: dispute.booking.rideOffer.departureAt.toISOString(),
      },
      openedBy: {
        userId: dispute.openedBy.id,
        displayName: dispute.openedBy.profile?.displayName ?? null,
      },
      status: dispute.status,
      reason: dispute.reason,
      resolutionNote: dispute.resolutionNote,
      openedAt: dispute.openedAt.toISOString(),
      resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
      createdAt: dispute.createdAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
    };
  }

  private toAdminResponse(dispute: DisputeRecord): AdminPaymentDisputeResponse {
    return {
      ...this.toUserResponse(dispute),
      reviewedBy: dispute.reviewedBy
        ? {
            userId: dispute.reviewedBy.id,
            displayName: dispute.reviewedBy.profile?.displayName ?? null,
          }
        : null,
    };
  }
}
