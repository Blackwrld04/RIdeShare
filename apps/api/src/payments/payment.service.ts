import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import {
  BookingStatus,
  LedgerJournalKind,
  PaymentStatus,
  Prisma,
  RefundKind,
  RefundStatus,
  RideStatus,
} from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  calculateRefund,
  escrowFundedEntries,
  refundReservedEntries,
  refundSettledEntries,
  tripSettledEntries,
} from "./ledger.policy.js";
import { LedgerService } from "./ledger.service.js";
import { calculatePlatformFeeKobo } from "./payment.policy.js";
import type {
  InitializeCheckoutInput,
  PaystackWebhook,
} from "./payment.schemas.js";
import { PaystackClient } from "./paystack.client.js";

const paymentInclude = {
  booking: {
    select: {
      passengerUserId: true,
      status: true,
    },
  },
} satisfies Prisma.PaymentTransactionInclude;

type PaymentRecord = Prisma.PaymentTransactionGetPayload<{
  include: typeof paymentInclude;
}>;

type RefundRecord = Prisma.PaymentRefundGetPayload<Record<string, never>>;

interface ReservedPaymentAttempt {
  paymentId: string;
  existing: boolean;
  email: string;
  amountKobo: bigint;
  currency: string;
  reference: string;
  bookingId: string;
}

export interface PaymentResponse {
  id: string;
  bookingId: string;
  status: string;
  provider: string;
  reference: string;
  baseAmountKobo: number;
  platformFeeKobo: number;
  amountKobo: number;
  currency: string;
  authorizationUrl: string | null;
  accessCode: string | null;
  paidAt: string | null;
  refundRequiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  bookingId: string;
  kind: string;
  status: string;
  amountKobo: number;
  driverCompensationKobo: number;
  currency: string;
  reason: string;
  providerRefundId: string | null;
  submittedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaystackClient) private readonly paystack: PaystackClient,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

  async initializeCheckout(
    userId: string,
    input: InitializeCheckoutInput,
  ): Promise<PaymentResponse> {
    const attempt = await this.reservePaymentAttempt(userId, input.bookingId);

    if (attempt.existing) {
      return this.getOwned(userId, attempt.paymentId);
    }

    try {
      const initialized = await this.paystack.initialize({
        email: attempt.email,
        amountKobo: Number(attempt.amountKobo),
        currency: attempt.currency,
        reference: attempt.reference,
        callbackUrl: this.config.PAYSTACK_CALLBACK_URL,
        metadata: {
          bookingId: attempt.bookingId,
          paymentId: attempt.paymentId,
        },
      });

      if (initialized.reference !== attempt.reference) {
        throw new Error("Paystack returned an unexpected reference");
      }

      const updated = await this.database.client.paymentTransaction.updateMany({
        where: {
          id: attempt.paymentId,
          status: PaymentStatus.INITIALIZING,
        },
        data: {
          status: PaymentStatus.INITIALIZED,
          authorizationUrl: initialized.authorizationUrl,
          accessCode: initialized.accessCode,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          "Payment initialization is no longer active",
        );
      }
    } catch (error) {
      await this.database.client.paymentTransaction.updateMany({
        where: {
          id: attempt.paymentId,
          status: PaymentStatus.INITIALIZING,
        },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          providerMessage: this.errorMessage(error),
        },
      });

      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        "Paystack checkout could not be initialized",
      );
    }

    return this.getOwned(userId, attempt.paymentId);
  }

  async get(userId: string, paymentId: string): Promise<PaymentResponse> {
    return this.getOwned(userId, paymentId);
  }

  async handlePaystackWebhook(event: PaystackWebhook): Promise<void> {
    if (event.event.startsWith("refund.")) {
      await this.handleRefundWebhook(event);
      return;
    }

    if (event.event !== "charge.success" || !event.data.reference) {
      return;
    }

    const payment = await this.database.client.paymentTransaction.findUnique({
      where: { reference: event.data.reference },
      select: {
        id: true,
        reference: true,
        amountKobo: true,
        currency: true,
        booking: { select: { rideOfferId: true } },
      },
    });

    if (!payment) {
      return;
    }

    const verified = await this.paystack.verify(payment.reference);

    if (verified.status !== "success") {
      return;
    }
    if (
      verified.reference !== payment.reference ||
      BigInt(verified.amountKobo) !== payment.amountKobo ||
      verified.currency !== payment.currency
    ) {
      throw new BadRequestException(
        "Paystack verification did not match payment",
      );
    }

    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM ride_offers WHERE id = ${payment.booking.rideOfferId} FOR UPDATE`,
      );
      const current = await transaction.paymentTransaction.findUnique({
        where: { id: payment.id },
        include: {
          booking: {
            select: {
              status: true,
              rideOffer: { select: { status: true, departureAt: true } },
            },
          },
        },
      });

      if (!current) {
        return;
      }
      if (
        current.status === PaymentStatus.SUCCEEDED ||
        current.status === PaymentStatus.REFUND_PENDING ||
        current.status === PaymentStatus.REFUNDED
      ) {
        return;
      }

      const paidAt = verified.paidAt ?? new Date();
      const canConfirm =
        current.booking.status === BookingStatus.AWAITING_PAYMENT &&
        (current.booking.rideOffer.status === RideStatus.PUBLISHED ||
          current.booking.rideOffer.status === RideStatus.FULL) &&
        current.booking.rideOffer.departureAt > paidAt;

      await transaction.paymentTransaction.update({
        where: { id: current.id },
        data: {
          status: canConfirm
            ? PaymentStatus.SUCCEEDED
            : PaymentStatus.REFUND_PENDING,
          providerTransactionId: verified.id,
          providerMessage: "Verified charge.success",
          paidAt,
          ...(canConfirm ? {} : { refundRequiredAt: new Date() }),
        },
      });

      await this.ledger.createJournal(transaction, {
        bookingId: current.bookingId,
        paymentId: current.id,
        kind: LedgerJournalKind.ESCROW_FUNDED,
        idempotencyKey: `payment:${current.id}:escrow-funded`,
        currency: current.currency,
        entries: escrowFundedEntries(current.amountKobo),
      });

      if (canConfirm) {
        const confirmed = await transaction.rideBooking.updateMany({
          where: {
            id: current.bookingId,
            status: BookingStatus.AWAITING_PAYMENT,
          },
          data: {
            status: BookingStatus.CONFIRMED,
            decidedAt: paidAt,
            decisionReason: "Payment verified",
          },
        });

        if (confirmed.count !== 1) {
          throw new ConflictException("Booking payment state changed");
        }
      }
    });

    const updated = await this.database.client.paymentTransaction.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });

    if (updated?.status === PaymentStatus.REFUND_PENDING) {
      await this.refundPayment(
        payment.id,
        RefundKind.FULFILLMENT_FAILED,
        "Ride was unavailable when payment completed",
      );
    }
  }

  async refundBooking(
    bookingId: string,
    kind: RefundKind,
    reason: string,
  ): Promise<void> {
    const payment = await this.database.client.paymentTransaction.findFirst({
      where: {
        bookingId,
        status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUND_PENDING] },
      },
      orderBy: { paidAt: "desc" },
      select: { id: true },
    });

    if (payment) {
      await this.refundPayment(payment.id, kind, reason);
    }
  }

  async refundRideBookings(rideId: string, reason: string): Promise<void> {
    const payments = await this.database.client.paymentTransaction.findMany({
      where: {
        booking: { rideOfferId: rideId },
        status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUND_PENDING] },
      },
      select: { id: true },
    });

    for (const payment of payments) {
      await this.refundPayment(
        payment.id,
        RefundKind.DRIVER_CANCELLATION,
        reason,
      );
    }
  }

  async getRefund(userId: string, refundId: string): Promise<RefundResponse> {
    const refund = await this.database.client.paymentRefund.findFirst({
      where: {
        id: refundId,
        booking: {
          OR: [
            { passengerUserId: userId },
            { rideOffer: { driverApplication: { userId } } },
          ],
        },
      },
    });

    if (!refund) {
      throw new NotFoundException("Refund not found");
    }

    return this.toRefundResponse(refund);
  }

  async settleRideBookings(
    transaction: Prisma.TransactionClient,
    rideId: string,
  ): Promise<void> {
    const payments = await transaction.paymentTransaction.findMany({
      where: {
        booking: {
          rideOfferId: rideId,
          status: BookingStatus.COMPLETED,
        },
        status: PaymentStatus.SUCCEEDED,
        refund: null,
      },
    });

    for (const payment of payments) {
      await this.ledger.createJournal(transaction, {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        kind: LedgerJournalKind.TRIP_SETTLED,
        idempotencyKey: `payment:${payment.id}:trip-settled`,
        currency: payment.currency,
        entries: tripSettledEntries(
          payment.baseAmountKobo,
          payment.platformFeeKobo,
        ),
      });
    }
  }

  private async refundPayment(
    paymentId: string,
    kind: RefundKind,
    reason: string,
  ): Promise<void> {
    const refundId = await this.database.client.$transaction(
      async (transaction) => {
        const paymentReference =
          await transaction.paymentTransaction.findUnique({
            where: { id: paymentId },
            select: { booking: { select: { rideOfferId: true } } },
          });

        if (!paymentReference) {
          return null;
        }

        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM ride_offers WHERE id = ${paymentReference.booking.rideOfferId} FOR UPDATE`,
        );
        const payment = await transaction.paymentTransaction.findUnique({
          where: { id: paymentId },
          include: {
            refund: true,
            booking: {
              select: {
                passengerUserId: true,
                rideOffer: { select: { departureAt: true } },
              },
            },
          },
        });

        if (!payment) {
          return null;
        }
        if (payment.refund) {
          return payment.refund.status === RefundStatus.REQUESTED
            ? payment.refund.id
            : null;
        }
        if (
          payment.status !== PaymentStatus.SUCCEEDED &&
          payment.status !== PaymentStatus.REFUND_PENDING
        ) {
          return null;
        }

        const breakdown = calculateRefund(
          kind,
          payment.baseAmountKobo,
          payment.platformFeeKobo,
          payment.booking.rideOffer.departureAt,
        );
        const refund = await transaction.paymentRefund.create({
          data: {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            kind,
            amountKobo: breakdown.refundAmountKobo,
            driverCompensationKobo: breakdown.driverCompensationKobo,
            currency: payment.currency,
            reason,
          },
        });

        await transaction.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUND_PENDING,
            refundRequiredAt: payment.refundRequiredAt ?? new Date(),
          },
        });
        await this.ledger.createJournal(transaction, {
          bookingId: payment.bookingId,
          paymentId: payment.id,
          refundId: refund.id,
          userId: payment.booking.passengerUserId,
          kind: LedgerJournalKind.REFUND_RESERVED,
          idempotencyKey: `refund:${refund.id}:reserved`,
          currency: payment.currency,
          entries: refundReservedEntries(
            payment.amountKobo,
            breakdown.refundAmountKobo,
            breakdown.driverCompensationKobo,
          ),
        });

        return refund.id;
      },
    );

    if (refundId) {
      await this.submitRefund(refundId);
    }
  }

  private async submitRefund(refundId: string): Promise<void> {
    const claimed = await this.database.client.paymentRefund.updateMany({
      where: { id: refundId, status: RefundStatus.REQUESTED },
      data: { status: RefundStatus.SUBMITTING },
    });

    if (claimed.count !== 1) {
      return;
    }

    const refund = await this.database.client.paymentRefund.findUniqueOrThrow({
      where: { id: refundId },
      include: { payment: { select: { reference: true } } },
    });

    try {
      const submitted = await this.paystack.createRefund({
        transactionReference: refund.payment.reference,
        amountKobo: Number(refund.amountKobo),
        currency: refund.currency,
        reason: refund.reason,
      });

      if (
        BigInt(submitted.amountKobo) !== refund.amountKobo ||
        submitted.currency !== refund.currency
      ) {
        throw new Error("Paystack returned an unexpected refund amount");
      }

      await this.database.client.paymentRefund.updateMany({
        where: { id: refund.id, status: RefundStatus.SUBMITTING },
        data: {
          status:
            submitted.status === "processing"
              ? RefundStatus.PROCESSING
              : RefundStatus.SUBMITTED,
          providerRefundId: submitted.id,
          providerMessage: submitted.message.slice(0, 280),
          submittedAt: new Date(),
        },
      });
    } catch (error) {
      await this.database.client.paymentRefund.updateMany({
        where: { id: refund.id, status: RefundStatus.SUBMITTING },
        data: {
          status: RefundStatus.FAILED,
          failedAt: new Date(),
          providerMessage: this.errorMessage(error),
        },
      });
    }
  }

  private async handleRefundWebhook(event: PaystackWebhook): Promise<void> {
    const reference = event.data.transaction_reference;

    if (!reference || event.data.amount === undefined || !event.data.currency) {
      throw new BadRequestException("Paystack refund event was incomplete");
    }

    const payment = await this.database.client.paymentTransaction.findUnique({
      where: { reference },
      include: { refund: true },
    });

    if (!payment?.refund) {
      return;
    }

    const refund = payment.refund;

    if (BigInt(event.data.amount) !== refund.amountKobo) {
      throw new BadRequestException("Paystack refund amount did not match");
    }
    if (event.data.currency !== refund.currency) {
      throw new BadRequestException("Paystack refund currency did not match");
    }

    await this.database.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM payment_refunds WHERE id = ${refund.id} FOR UPDATE`,
      );
      const current = await transaction.paymentRefund.findUnique({
        where: { id: refund.id },
      });

      if (!current) {
        return;
      }

      if (current.status === RefundStatus.PROCESSED) {
        return;
      }

      if (event.event === "refund.processed") {
        const processedAt = new Date();
        await transaction.paymentRefund.update({
          where: { id: current.id },
          data: { status: RefundStatus.PROCESSED, processedAt, failedAt: null },
        });
        await transaction.paymentTransaction.update({
          where: { id: current.paymentId },
          data: { status: PaymentStatus.REFUNDED, refundedAt: processedAt },
        });
        await this.ledger.createJournal(transaction, {
          bookingId: current.bookingId,
          paymentId: current.paymentId,
          refundId: current.id,
          kind: LedgerJournalKind.REFUND_SETTLED,
          idempotencyKey: `refund:${current.id}:settled`,
          currency: current.currency,
          entries: refundSettledEntries(current.amountKobo),
        });
        return;
      }

      const statusByEvent = {
        "refund.pending": RefundStatus.SUBMITTED,
        "refund.processing": RefundStatus.PROCESSING,
        "refund.needs-attention": RefundStatus.NEEDS_ATTENTION,
        "refund.failed": RefundStatus.FAILED,
      } as const;
      const status = statusByEvent[event.event as keyof typeof statusByEvent];

      if (status) {
        await transaction.paymentRefund.update({
          where: { id: current.id },
          data: {
            status,
            ...(status === RefundStatus.FAILED ? { failedAt: new Date() } : {}),
          },
        });
      }
    });
  }

  private async reservePaymentAttempt(
    userId: string,
    bookingId: string,
  ): Promise<ReservedPaymentAttempt> {
    return this.database.client.$transaction(async (transaction) => {
      const bookingReference = await transaction.rideBooking.findFirst({
        where: { id: bookingId, passengerUserId: userId },
        select: { rideOfferId: true },
      });

      if (!bookingReference) {
        throw new NotFoundException("Booking not found");
      }

      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM ride_offers WHERE id = ${bookingReference.rideOfferId} FOR UPDATE`,
      );
      const booking = await transaction.rideBooking.findFirst({
        where: { id: bookingId, passengerUserId: userId },
        include: {
          passenger: { select: { profile: true } },
          rideOffer: { select: { status: true, departureAt: true } },
          payments: {
            where: {
              status: {
                in: [PaymentStatus.INITIALIZING, PaymentStatus.INITIALIZED],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }
      if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
        throw new ConflictException("Booking is not awaiting payment");
      }
      if (
        (booking.rideOffer.status !== RideStatus.PUBLISHED &&
          booking.rideOffer.status !== RideStatus.FULL) ||
        booking.rideOffer.departureAt <= new Date()
      ) {
        throw new ConflictException("Ride is no longer accepting payment");
      }

      const email = booking.passenger.profile?.billingEmail;

      if (!email) {
        throw new BadRequestException(
          "Add a billing email before starting checkout",
        );
      }

      const existing = booking.payments[0];

      if (existing) {
        if (existing.status === PaymentStatus.INITIALIZING) {
          throw new ConflictException("Payment initialization is in progress");
        }

        return {
          paymentId: existing.id,
          existing: true,
          email,
          amountKobo: existing.amountKobo,
          currency: existing.currency,
          reference: existing.reference,
          bookingId: booking.id,
        };
      }

      const platformFeeKobo = calculatePlatformFeeKobo(
        booking.totalContributionKobo,
        this.config.PLATFORM_FEE_BASIS_POINTS,
      );
      const payment = await transaction.paymentTransaction.create({
        data: {
          bookingId: booking.id,
          reference: `CS-${randomUUID()}`,
          baseAmountKobo: booking.totalContributionKobo,
          platformFeeKobo,
          amountKobo: booking.totalContributionKobo + platformFeeKobo,
          currency: booking.currency,
        },
      });

      return {
        paymentId: payment.id,
        existing: false,
        email,
        amountKobo: payment.amountKobo,
        currency: payment.currency,
        reference: payment.reference,
        bookingId: booking.id,
      };
    });
  }

  private async getOwned(
    userId: string,
    paymentId: string,
  ): Promise<PaymentResponse> {
    const payment = await this.database.client.paymentTransaction.findFirst({
      where: { id: paymentId, booking: { passengerUserId: userId } },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return this.toResponse(payment);
  }

  private errorMessage(error: unknown): string {
    return (
      error instanceof Error ? error.message : "Unknown provider error"
    ).slice(0, 280);
  }

  private toResponse(payment: PaymentRecord): PaymentResponse {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      provider: payment.provider,
      reference: payment.reference,
      baseAmountKobo: Number(payment.baseAmountKobo),
      platformFeeKobo: Number(payment.platformFeeKobo),
      amountKobo: Number(payment.amountKobo),
      currency: payment.currency,
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
      paidAt: payment.paidAt?.toISOString() ?? null,
      refundRequiredAt: payment.refundRequiredAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private toRefundResponse(refund: RefundRecord): RefundResponse {
    return {
      id: refund.id,
      paymentId: refund.paymentId,
      bookingId: refund.bookingId,
      kind: refund.kind,
      status: refund.status,
      amountKobo: Number(refund.amountKobo),
      driverCompensationKobo: Number(refund.driverCompensationKobo),
      currency: refund.currency,
      reason: refund.reason,
      providerRefundId: refund.providerRefundId,
      submittedAt: refund.submittedAt?.toISOString() ?? null,
      processedAt: refund.processedAt?.toISOString() ?? null,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
    };
  }
}
