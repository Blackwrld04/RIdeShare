import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import {
  BookingStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  RidePointKind,
  RideStatus,
} from "@commuteshare/database";
import {
  ConflictException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { EmergencyContactService } from "./emergency-contact.service.js";
import { RideSafetyService } from "./ride-safety.service.js";

const describeIntegration = process.env.SAFETY_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("ride safety integration", () => {
  let database: Database;
  let contacts: EmergencyContactService;
  let safety: RideSafetyService;
  let driverUserId: string;
  let passengerUserId: string;
  let outsiderUserId: string;
  let rideId: string;
  let shareToken: string;
  let shareLinkId: string;
  let alertId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.SAFETY_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("SAFETY_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    const databaseService = database as unknown as DatabaseService;
    contacts = new EmergencyContactService(databaseService);
    safety = new RideSafetyService(
      {
        EMERGENCY_CALL_NUMBER: "112",
        SAFETY_SHARE_MAX_HOURS: 168,
        LOCATION_PING_MIN_INTERVAL_SECONDS: 2,
      } as AppConfig,
      databaseService,
    );
    const suffix = randomUUID().slice(0, 8);
    const [driver, passenger, outsider] = await Promise.all([
      database.client.user.create({
        data: {
          phoneE164: `+234811${suffix.slice(0, 6)}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Safety Driver" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234812${suffix.slice(0, 6)}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Safety Passenger" } },
        },
      }),
      database.client.user.create({
        data: {
          phoneE164: `+234813${suffix.slice(0, 6)}`,
          phoneVerifiedAt: new Date(),
          profile: { create: { displayName: "Safety Outsider" } },
        },
      }),
    ]);
    driverUserId = driver.id;
    passengerUserId = passenger.id;
    outsiderUserId = outsider.id;
    const driverApplication = await database.client.driverApplication.create({
      data: {
        userId: driver.id,
        status: DriverApplicationStatus.APPROVED,
      },
    });
    const ride = await database.client.rideOffer.create({
      data: {
        driverApplicationId: driverApplication.id,
        status: RideStatus.PUBLISHED,
        departureAt: new Date(Date.now() + 60 * 60 * 1_000),
        passengerSeats: 3,
        contributionKobo: 250_000n,
        routePoints: {
          create: [
            {
              sequence: 0,
              kind: RidePointKind.ORIGIN,
              label: "Yaba",
              latitude: 6.5095,
              longitude: 3.3711,
            },
            {
              sequence: 1,
              kind: RidePointKind.DESTINATION,
              label: "Marina",
              latitude: 6.4541,
              longitude: 3.3947,
            },
          ],
        },
      },
    });
    rideId = ride.id;
    await Promise.all([
      database.client.rideBooking.create({
        data: {
          rideOfferId: ride.id,
          passengerUserId: passenger.id,
          seats: 1,
          status: BookingStatus.CONFIRMED,
          unitContributionKobo: 250_000n,
          totalContributionKobo: 250_000n,
          currency: "NGN",
        },
      }),
      database.client.rideBooking.create({
        data: {
          rideOfferId: ride.id,
          passengerUserId: outsider.id,
          seats: 1,
          status: BookingStatus.PENDING,
          unitContributionKobo: 250_000n,
          totalContributionKobo: 250_000n,
          currency: "NGN",
        },
      }),
    ]);
  });

  afterAll(async () => {
    await database.client.rideOffer.delete({ where: { id: rideId } });
    await database.client.user.deleteMany({
      where: {
        id: { in: [driverUserId, passengerUserId, outsiderUserId] },
      },
    });
    await database.close();
  });

  it("normalizes contacts and maintains one primary contact", async () => {
    const first = await contacts.create(passengerUserId, {
      name: "Ada",
      phone: "08012345678",
      isPrimary: false,
    });
    const second = await contacts.create(passengerUserId, {
      name: "Tunde",
      phone: "08023456789",
      relationship: "Brother",
      isPrimary: true,
    });
    const listed = await contacts.list(passengerUserId);

    expect(first.phoneE164).toBe("+2348012345678");
    expect(listed.filter((contact) => contact.isPrimary)).toHaveLength(1);
    expect(listed.find((contact) => contact.isPrimary)?.id).toBe(second.id);
  });

  it("creates private participant-bound trip share links", async () => {
    const share = await safety.createShareLink(passengerUserId, rideId, {
      label: "Family",
      expiresInHours: 24,
    });
    shareToken = share.token;
    shareLinkId = share.id;
    const publicShare = await safety.getPublicShare(share.token);

    expect(publicShare.participant.role).toBe("passenger");
    expect(publicShare.ride.route.map((point) => point.label)).toEqual([
      "Yaba",
      "Marina",
    ]);
    expect(publicShare.latestLocation).toBeNull();
    await expect(
      safety.createShareLink(outsiderUserId, rideId, { expiresInHours: 24 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("records rate-limited live locations only during the trip", async () => {
    await expect(
      safety.recordLocation(passengerUserId, rideId, {
        latitude: 6.5,
        longitude: 3.38,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await database.client.rideOffer.update({
      where: { id: rideId },
      data: { status: RideStatus.IN_PROGRESS, startedAt: new Date() },
    });
    await safety.recordLocation(passengerUserId, rideId, {
      latitude: 6.5,
      longitude: 3.38,
      accuracyMeters: 8,
      headingDegrees: 125,
    });
    const publicShare = await safety.getPublicShare(shareToken);

    expect(publicShare.latestLocation).toMatchObject({
      latitude: 6.5,
      longitude: 3.38,
      accuracyMeters: 8,
    });
    await expect(
      safety.recordLocation(passengerUserId, rideId, {
        latitude: 6.5001,
        longitude: 3.3801,
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("creates idempotent SOS alerts without claiming external dispatch", async () => {
    const clientAlertId = randomUUID();
    const first = await safety.createSosAlert(passengerUserId, rideId, {
      clientAlertId,
      latitude: 6.5002,
      longitude: 3.3802,
      accuracyMeters: 5,
      message: "I need help",
    });
    const repeated = await safety.createSosAlert(passengerUserId, rideId, {
      clientAlertId,
      latitude: 6.5002,
      longitude: 3.3802,
      accuracyMeters: 5,
      message: "I need help",
    });
    alertId = first.id;

    expect(repeated.id).toBe(first.id);
    expect(first).toMatchObject({
      emergencyNumber: "112",
      dispatchStatus: "NOT_DISPATCHED",
      status: "ACTIVE",
    });
    expect(first.emergencyContacts).toHaveLength(2);
    expect(
      await database.client.userNotification.count({
        where: { userId: driverUserId, kind: "safety_sos" },
      }),
    ).toBe(1);
  });

  it("resolves alerts and revokes public share access", async () => {
    const resolved = await safety.resolveAlert(passengerUserId, alertId, {
      note: "False alarm",
    });
    expect(resolved.status).toBe("RESOLVED");

    await safety.revokeShareLink(passengerUserId, shareLinkId);
    await expect(safety.getPublicShare(shareToken)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
