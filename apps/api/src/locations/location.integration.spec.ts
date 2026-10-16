import { createDatabase, type Database } from "@commuteshare/database";
import { BadRequestException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { LocationService } from "./location.service.js";

const describeIntegration = process.env.LOCATION_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("safe landmark integration", () => {
  let database: Database;
  let locations: LocationService;
  let landmarkId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.LOCATION_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("LOCATION_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    locations = new LocationService(database as unknown as DatabaseService);
    const landmark = await locations.create({
      name: "RideShare Yaba Hub",
      address: "Yaba Bus Terminal, Lagos",
      category: "transport_hub",
      city: "Lagos",
      state: "Lagos",
      latitude: 6.5095,
      longitude: 3.3711,
      externalSource: "test",
      externalId: `safe-landmark-${Date.now()}`,
      safetyNotes: "Meet beside the staffed entrance",
    });
    landmarkId = landmark.id;
  });

  afterAll(async () => {
    await database.client.safeLandmark.delete({ where: { id: landmarkId } });
    await database.close();
  });

  it("finds active hubs by text and proximity", async () => {
    const results = await locations.search({
      q: "RideShare Yaba",
      latitude: 6.5096,
      longitude: 3.3712,
      radiusMeters: 1_000,
      limit: 20,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: landmarkId,
      category: "transport_hub",
      isActive: true,
    });
    expect(results[0]?.distanceMeters).toBeLessThan(50);
  });

  it("validates route coordinates against a selected hub", async () => {
    await expect(
      locations.assertRouteLandmarks({
        origin: {
          label: "Yaba",
          latitude: 6.5095,
          longitude: 3.3711,
          safeLandmarkId: landmarkId,
        },
        waypoints: [],
        destination: {
          label: "Marina",
          latitude: 6.4541,
          longitude: 3.3947,
        },
      }),
    ).resolves.toBeUndefined();

    await expect(
      locations.assertRouteLandmarks({
        origin: {
          label: "Wrong position",
          latitude: 6.6,
          longitude: 3.5,
          safeLandmarkId: landmarkId,
        },
        waypoints: [],
        destination: {
          label: "Marina",
          latitude: 6.4541,
          longitude: 3.3947,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("removes deactivated hubs from rider search", async () => {
    await locations.update(landmarkId, { isActive: false });
    await expect(
      locations.search({
        q: "RideShare Yaba",
        radiusMeters: 10_000,
        limit: 20,
      }),
    ).resolves.toEqual([]);
  });
});
