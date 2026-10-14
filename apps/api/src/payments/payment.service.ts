import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
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
import { calculatePlatformFeeKobo } from "./payment.policy.js";
import type { InitializeCheckoutInput } from "./payment.schemas.js";
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

@Injectable()
export class PaymentService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaystackClient) private readonly paystack: PaystackClient,
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
}
