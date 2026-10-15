import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  RideStatus,
} from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { ReviewService } from "./review.service.js";

const describeIntegration = process.env.REVIEW_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("ride review integration", () => {
  let database: Database;
  let reviews: ReviewService;
  let driverUserId: string;
  let passengerUserId: string;
  let outsiderUserId: string;
  let completedBookingId: string;
  let confirmedBookingId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.REVIEW_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("REVIEW_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    reviews = new ReviewService(database as unknown as DatabaseService);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
    const [driver, passenger, outsider] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234814${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Review Driver" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234815${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Review Passenger" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234816${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Review Outsider" } },
        },
      }),
    ]);
    driverUserId = driver.id;
    passengerUserId = passenger.id;
    outsiderUserId = outsider.id;
    const application = await database.client.driverApplication.create({
      data: {
        userId: driverUserId,
        status: DriverApplicationStatus.APPROVED,
      },
    });
    const [completedRide, upcomingRide] = await Promise.all([
      database.client.rideOffer.create({
        data: {
          driverApplicationId: application.id,
          status: RideStatus.COMPLETED,
          departureAt: new Date(Date.now() - 60 * 60 * 1_000),
          passengerSeats: 3,
          contributionKobo: 200_000n,
          completedAt: new Date(),
        },
      }),
      database.client.rideOffer.create({
        data: {
          driverApplicationId: application.id,
          status: RideStatus.PUBLISHED,
          departureAt: new Date(Date.now() + 60 * 60 * 1_000),
          passengerSeats: 3,
          contributionKobo: 200_000n,
        },
      }),
    ]);
    const [completedBooking, confirmedBooking] = await Promise.all([
      database.client.rideBooking.create({
        data: {
          rideOfferId: completedRide.id,
          passengerUserId,
          seats: 1,
          status: BookingStatus.COMPLETED,
          unitContributionKobo: 200_000n,
          totalContributionKobo: 200_000n,
          currency: "NGN",
          completedAt: new Date(),
        },
      }),
      database.client.rideBooking.create({
        data: {
          rideOfferId: upcomingRide.id,
          passengerUserId,
          seats: 1,
          status: BookingStatus.CONFIRMED,
          unitContributionKobo: 200_000n,
          totalContributionKobo: 200_000n,
          currency: "NGN",
        },
      }),
    ]);
    completedBookingId = completedBooking.id;
    confirmedBookingId = confirmedBooking.id;
  });

  afterAll(async () => {
    await database.client.user.deleteMany({
      where: {
        id: { in: [driverUserId, passengerUserId, outsiderUserId] },
      },
    });
    await database.close();
  });

  it("allows both completed-trip participants to review each other", async () => {
    const driverReview = await reviews.create(
      passengerUserId,
      completedBookingId,
      { rating: 5, comment: "Safe and punctual" },
    );
    const passengerReview = await reviews.create(
      driverUserId,
      completedBookingId,
      { rating: 4, comment: "Ready at pickup" },
    );

    expect(driverReview).toMatchObject({
      bookingId: completedBookingId,
      subjectUserId: driverUserId,
      rating: 5,
      author: {
        userId: passengerUserId,
        displayName: "Review Passenger",
      },
    });
    expect(passengerReview).toMatchObject({
      subjectUserId: passengerUserId,
      rating: 4,
      author: { userId: driverUserId, displayName: "Review Driver" },
    });
    expect(
      await database.client.userNotification.count({
        where: { kind: "ride_review_received" },
      }),
    ).toBe(2);
  });

  it("returns aggregate scores and review pages", async () => {
    await expect(
      reviews.listForUser(driverUserId, { limit: 20 }),
    ).resolves.toMatchObject({
      userId: driverUserId,
      averageRating: 5,
      reviewCount: 1,
      items: [{ rating: 5, comment: "Safe and punctual" }],
      nextCursor: null,
    });
  });

  it("rejects duplicates, outsiders, and unfinished rides", async () => {
    await expect(
      reviews.create(passengerUserId, completedBookingId, { rating: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      reviews.create(outsiderUserId, completedBookingId, { rating: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      reviews.create(passengerUserId, confirmedBookingId, { rating: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects cursors from another user's review history", async () => {
    const passengerSummary = await reviews.listForUser(passengerUserId, {
      limit: 20,
    });
    const passengerReviewId = passengerSummary.items[0]?.id;
    if (!passengerReviewId) {
      throw new Error("Passenger review fixture is missing");
    }
    await expect(
      reviews.listForUser(driverUserId, {
        cursor: passengerReviewId,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
