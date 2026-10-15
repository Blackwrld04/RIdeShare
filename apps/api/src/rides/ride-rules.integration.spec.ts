import { randomUUID } from "node:crypto";
import { loadConfig } from "@commuteshare/config";
import {
  BookingStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  PaymentStatus,
  ProfileGender,
  RideStatus,
} from "@commuteshare/database";
import { ForbiddenException, HttpException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BookingService } from "../bookings/booking.service.js";
import type { DatabaseService } from "../infrastructure/database.service.js";
import type { LedgerService } from "../payments/ledger.service.js";
import { PaymentService } from "../payments/payment.service.js";
import type { PayoutQueueService } from "../payments/payout-queue.service.js";
import type { PaystackClient } from "../payments/paystack.client.js";

const describeIntegration = process.env.RIDE_RULES_TEST_DATABASE_URL
  ? describe
  : describe.skip;

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  OTP_DEV_CODE: "000000",
  NINJA_PUBLIC_KEY: "ninja-public-key",
  NINJA_SECRET_KEY: "ninja-secret-key",
  IDENTITY_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  IDENTITY_HMAC_SECRET: "identity-hmac-secret-change-me-0001",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
});

describeIntegration("ride rules integration", () => {
  let database: Database;
  let bookings: BookingService;
  let payments: PaymentService;
  let driverUserId: string;
  let womanUserId: string;
  let manUserId: string;
  let rideId: string;
  let bookingId: string;
  const paystack = { initialize: vi.fn() };

  beforeAll(async () => {
    const databaseUrl = process.env.RIDE_RULES_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("RIDE_RULES_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    const databaseService = database as unknown as DatabaseService;
    bookings = new BookingService(config, databaseService, {
      refundBooking: vi.fn(),
    } as unknown as PaymentService);
    payments = new PaymentService(
      config,
      databaseService,
      paystack as unknown as PaystackClient,
      {} as LedgerService,
      {} as PayoutQueueService,
    );
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
    const [driver, woman, man] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234841${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: "Woman Driver",
              gender: ProfileGender.WOMAN,
              billingEmail: `driver-${suffix}@example.com`,
            },
          },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234842${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: "Woman Passenger",
              gender: ProfileGender.WOMAN,
              billingEmail: `woman-${suffix}@example.com`,
            },
          },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234843${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: "Man Passenger",
              gender: ProfileGender.MAN,
              billingEmail: `man-${suffix}@example.com`,
            },
          },
        },
      }),
    ]);
    driverUserId = driver.id;
    womanUserId = woman.id;
    manUserId = man.id;
    const application = await database.client.driverApplication.create({
      data: {
        userId: driver.id,
        status: DriverApplicationStatus.APPROVED,
      },
    });
    const ride = await database.client.rideOffer.create({
      data: {
        driverApplicationId: application.id,
        status: RideStatus.PUBLISHED,
        departureAt: new Date(Date.now() + 2 * 60 * 60 * 1_000),
        passengerSeats: 3,
        contributionKobo: 200_000n,
        womenOnly: true,
      },
    });
    rideId = ride.id;
  });

  afterAll(async () => {
    await database.client.paymentTransaction.deleteMany({
      where: { bookingId },
    });
    await database.client.rideBooking.deleteMany({
      where: { rideOfferId: rideId },
    });
    await database.client.rideOffer.delete({ where: { id: rideId } });
    await database.client.driverApplication.deleteMany({
      where: { userId: driverUserId },
    });
    await database.client.user.deleteMany({
      where: { id: { in: [driverUserId, womanUserId, manUserId] } },
    });
    await database.close();
  });

  it("enforces women-only booking eligibility", async () => {
    await expect(
      bookings.create(manUserId, { rideId, seats: 1 }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const booking = await bookings.create(womanUserId, { rideId, seats: 1 });
    bookingId = booking.id;
    expect(booking.status).toBe(BookingStatus.PENDING);
  });

  it("limits repeated checkout initialization attempts", async () => {
    await database.client.rideBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.AWAITING_PAYMENT },
    });
    await database.client.paymentTransaction.createMany({
      data: Array.from({ length: 3 }, (_, index) => ({
        bookingId,
        status: PaymentStatus.FAILED,
        reference: `rules-${randomUUID()}-${index}`,
        baseAmountKobo: 200_000n,
        platformFeeKobo: 30_000n,
        amountKobo: 230_000n,
        currency: "NGN",
        failedAt: new Date(),
      })),
    });

    await expect(
      payments.initializeCheckout(womanUserId, { bookingId }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(paystack.initialize).not.toHaveBeenCalled();
  });
});
