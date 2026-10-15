import { randomUUID } from "node:crypto";
import {
  BankAccountStatus,
  BookingStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  PaymentDisputeStatus,
  PaymentStatus,
  PayoutStatus,
  RideStatus,
  UserRole,
} from "@commuteshare/database";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import type { PaymentService } from "../payments/payment.service.js";
import { DisputeService } from "./dispute.service.js";

const describeIntegration = process.env.DISPUTE_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("payment dispute integration", () => {
  let database: Database;
  let disputes: DisputeService;
  let driverUserId: string;
  let passengerUserId: string;
  let outsiderUserId: string;
  let reviewerUserId: string;
  let rideId: string;
  let bookingId: string;
  let payoutId: string;
  let disputeId: string;
  const payments = {
    refundBooking: vi.fn().mockResolvedValue(undefined),
    releaseHeldPayout: vi.fn().mockResolvedValue(undefined),
    removePayoutJob: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const databaseUrl = process.env.DISPUTE_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DISPUTE_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    disputes = new DisputeService(
      database as unknown as DatabaseService,
      payments as unknown as PaymentService,
    );
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
    const [driver, passenger, outsider, reviewer] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234831${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Dispute Driver" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234832${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Dispute Passenger" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234833${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Dispute Outsider" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234834${suffix}`,
          phoneVerifiedAt: new Date(),
          role: UserRole.REVIEWER,
          profile: { create: { displayName: "Dispute Reviewer" } },
        },
      }),
    ]);
    driverUserId = driver.id;
    passengerUserId = passenger.id;
    outsiderUserId = outsider.id;
    reviewerUserId = reviewer.id;
    const application = await database.client.driverApplication.create({
      data: {
        userId: driverUserId,
        status: DriverApplicationStatus.APPROVED,
      },
    });
    const bank = await database.client.driverBankAccount.create({
      data: {
        driverApplicationId: application.id,
        status: BankAccountStatus.VERIFIED,
        bankCode: "058",
        bankName: "GTBank",
        accountName: "DISPUTE DRIVER",
        accountNumberLast4: "6789",
        providerRecipientCode: `RCP_${suffix}`,
        resolvedAt: new Date(),
      },
    });
    const ride = await database.client.rideOffer.create({
      data: {
        driverApplicationId: application.id,
        status: RideStatus.COMPLETED,
        departureAt: new Date(Date.now() - 2 * 60 * 60 * 1_000),
        passengerSeats: 3,
        contributionKobo: 200_000n,
        completedAt: new Date(Date.now() - 60 * 60 * 1_000),
      },
    });
    rideId = ride.id;
    const booking = await database.client.rideBooking.create({
      data: {
        rideOfferId: ride.id,
        passengerUserId,
        seats: 1,
        status: BookingStatus.COMPLETED,
        unitContributionKobo: 200_000n,
        totalContributionKobo: 200_000n,
        currency: "NGN",
        completedAt: ride.completedAt,
      },
    });
    bookingId = booking.id;
    await database.client.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        status: PaymentStatus.SUCCEEDED,
        reference: `CS-${suffix}`,
        baseAmountKobo: 200_000n,
        platformFeeKobo: 30_000n,
        amountKobo: 230_000n,
        currency: "NGN",
        paidAt: new Date(),
      },
    });
    const payout = await database.client.driverPayout.create({
      data: {
        rideOfferId: ride.id,
        driverApplicationId: application.id,
        bankAccountId: bank.id,
        status: PayoutStatus.SCHEDULED,
        amountKobo: 200_000n,
        currency: "NGN",
        reference: `csp_${suffix}`,
        scheduledFor: new Date(Date.now() + 23 * 60 * 60 * 1_000),
      },
    });
    payoutId = payout.id;
  });

  afterAll(async () => {
    await database.client.userNotification.deleteMany({
      where: { userId: { in: [driverUserId, passengerUserId] } },
    });
    await database.client.paymentDispute.deleteMany({ where: { bookingId } });
    await database.client.driverPayout.deleteMany({ where: { id: payoutId } });
    await database.client.paymentTransaction.deleteMany({
      where: { bookingId },
    });
    await database.client.rideBooking.deleteMany({ where: { id: bookingId } });
    await database.client.rideOffer.deleteMany({ where: { id: rideId } });
    await database.client.driverBankAccount.deleteMany({
      where: { application: { userId: driverUserId } },
    });
    await database.client.driverApplication.deleteMany({
      where: { userId: driverUserId },
    });
    await database.client.user.deleteMany({
      where: {
        id: {
          in: [driverUserId, passengerUserId, outsiderUserId, reviewerUserId],
        },
      },
    });
    await database.close();
  });

  it("holds a scheduled payout when the passenger disputes in time", async () => {
    const dispute = await disputes.create(passengerUserId, bookingId, {
      reason: "The driver ended the trip far from the agreed destination",
    });
    disputeId = dispute.id;
    expect(dispute.status).toBe(PaymentDisputeStatus.OPEN);
    await expect(
      database.client.rideBooking.findUniqueOrThrow({
        where: { id: bookingId },
      }),
    ).resolves.toMatchObject({ status: BookingStatus.DISPUTED });
    await expect(
      database.client.driverPayout.findUniqueOrThrow({
        where: { id: payoutId },
      }),
    ).resolves.toMatchObject({ status: PayoutStatus.ON_HOLD });
    expect(payments.removePayoutJob).toHaveBeenCalledWith(payoutId);
  });

  it("rejects outsiders and duplicate disputes", async () => {
    await expect(
      disputes.create(outsiderUserId, bookingId, {
        reason: "An unrelated account cannot dispute another passenger ride",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      disputes.create(passengerUserId, bookingId, {
        reason: "A second dispute must not duplicate the existing dispute",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("releases a reviewed dispute and resumes settlement", async () => {
    const resolved = await disputes.resolve(reviewerUserId, disputeId, {
      action: "release",
      note: "Trip location evidence confirms completion at the agreed destination",
    });
    expect(resolved).toMatchObject({
      status: PaymentDisputeStatus.RELEASED,
      reviewedBy: { userId: reviewerUserId },
    });
    await expect(
      database.client.rideBooking.findUniqueOrThrow({
        where: { id: bookingId },
      }),
    ).resolves.toMatchObject({ status: BookingStatus.COMPLETED });
    expect(payments.releaseHeldPayout).toHaveBeenCalledWith(rideId);
  });
});
