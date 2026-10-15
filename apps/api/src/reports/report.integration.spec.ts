import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  RideStatus,
  UserReportStatus,
  UserRole,
} from "@commuteshare/database";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { ReportService } from "./report.service.js";

const describeIntegration = process.env.REPORT_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("user report integration", () => {
  let database: Database;
  let reports: ReportService;
  let driverUserId: string;
  let passengerUserId: string;
  let outsiderUserId: string;
  let reviewerUserId: string;
  let bookingId: string;
  let passengerReportId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.REPORT_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("REPORT_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    reports = new ReportService(database as unknown as DatabaseService);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
    const [driver, passenger, outsider, reviewer] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234821${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Report Driver" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234822${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Report Passenger" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234823${suffix}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Report Outsider" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234824${suffix}`,
          phoneVerifiedAt: new Date(),
          role: UserRole.REVIEWER,
          profile: { create: { displayName: "Report Reviewer" } },
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
    const ride = await database.client.rideOffer.create({
      data: {
        driverApplicationId: application.id,
        status: RideStatus.COMPLETED,
        departureAt: new Date(Date.now() - 60 * 60 * 1_000),
        passengerSeats: 3,
        contributionKobo: 180_000n,
        completedAt: new Date(),
      },
    });
    const booking = await database.client.rideBooking.create({
      data: {
        rideOfferId: ride.id,
        passengerUserId,
        seats: 1,
        status: BookingStatus.COMPLETED,
        unitContributionKobo: 180_000n,
        totalContributionKobo: 180_000n,
        currency: "NGN",
        completedAt: new Date(),
      },
    });
    bookingId = booking.id;
  });

  afterAll(async () => {
    await database.client.user.deleteMany({
      where: {
        id: {
          in: [driverUserId, passengerUserId, outsiderUserId, reviewerUserId],
        },
      },
    });
    await database.close();
  });

  it("derives report subjects from booking participants", async () => {
    const passengerReport = await reports.create(passengerUserId, bookingId, {
      category: "SAFETY",
      details: "The driver repeatedly ignored traffic lights",
    });
    const driverReport = await reports.create(driverUserId, bookingId, {
      category: "NO_SHOW",
      details: "The passenger was not present at the pickup point",
    });
    passengerReportId = passengerReport.id;

    expect(passengerReport).toMatchObject({
      reporter: { userId: passengerUserId },
      subject: { userId: driverUserId },
      status: UserReportStatus.OPEN,
    });
    expect(driverReport).toMatchObject({
      reporter: { userId: driverUserId },
      subject: { userId: passengerUserId },
    });
  });

  it("rejects duplicate and non-participant reports", async () => {
    await expect(
      reports.create(passengerUserId, bookingId, {
        category: "OTHER",
        details: "This duplicate must not create another case",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      reports.create(outsiderUserId, bookingId, {
        category: "OTHER",
        details: "An outsider cannot report this completed booking",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists scoped user and admin report queues", async () => {
    await expect(
      reports.listMine(passengerUserId, { limit: 20 }),
    ).resolves.toMatchObject({
      items: [
        {
          id: passengerReportId,
          category: "SAFETY",
          subject: { userId: driverUserId },
        },
      ],
      nextCursor: null,
    });
    await expect(
      reports.listAdmin({ status: "OPEN", category: "SAFETY", limit: 20 }),
    ).resolves.toMatchObject({
      items: [{ id: passengerReportId }],
    });
  });

  it("moves reports through review to a terminal resolution", async () => {
    const underReview = await reports.review(
      reviewerUserId,
      passengerReportId,
      { status: "UNDER_REVIEW" },
    );
    expect(underReview).toMatchObject({
      status: UserReportStatus.UNDER_REVIEW,
      reviewedBy: { userId: reviewerUserId },
    });

    const resolved = await reports.review(reviewerUserId, passengerReportId, {
      status: "RESOLVED",
      note: "The safety team completed its investigation and follow-up",
    });
    expect(resolved).toMatchObject({
      status: UserReportStatus.RESOLVED,
      resolutionNote:
        "The safety team completed its investigation and follow-up",
    });
    expect(
      await database.client.userNotification.count({
        where: {
          userId: passengerUserId,
          kind: "user_report_updated",
        },
      }),
    ).toBe(1);
    const reporterView = await reports.listMine(passengerUserId, { limit: 20 });
    expect(reporterView.items[0]).not.toHaveProperty("reviewedBy");
    await expect(
      reports.review(reviewerUserId, passengerReportId, {
        status: "DISMISSED",
        note: "A terminal report cannot be changed",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
