import { describe, expect, it } from "vitest";
import {
  createLandmarkSchema,
  geocodeSearchSchema,
  searchLandmarksSchema,
  updateLandmarkSchema,
} from "./location.schemas.js";

describe("location schemas", () => {
  it("accepts a provider-neutral safe landmark", () => {
    const landmark = createLandmarkSchema.parse({
      name: "Yaba Bus Terminal",
      address: "Herbert Macaulay Way, Yaba",
      category: "transport_hub",
      city: "Lagos",
      state: "Lagos",
      latitude: 6.5095,
      longitude: 3.3711,
      externalSource: "openstreetmap",
      externalId: "node:123",
      metadata: { lighting: true },
    });

    expect(landmark.externalSource).toBe("openstreetmap");
  });

  it("requires paired external identifiers", () => {
    expect(
      createLandmarkSchema.safeParse({
        name: "Yaba Bus Terminal",
        address: "Herbert Macaulay Way, Yaba",
        category: "transport_hub",
        city: "Lagos",
        state: "Lagos",
        latitude: 6.5095,
        longitude: 3.3711,
        externalSource: "openstreetmap",
      }).success,
    ).toBe(false);
    expect(
      updateLandmarkSchema.safeParse({ externalId: "node:123" }).success,
    ).toBe(false);
  });

  it("requires both coordinates for nearby search", () => {
    expect(
      searchLandmarksSchema.safeParse({ latitude: "6.5095" }).success,
    ).toBe(false);
    expect(
      searchLandmarksSchema.parse({
        latitude: "6.5095",
        longitude: "3.3711",
      }),
    ).toMatchObject({ radiusMeters: 10_000, limit: 20 });
  });

  it("accepts explicit provider searches", () => {
    expect(geocodeSearchSchema.parse({ q: "Yaba Lagos" })).toEqual({
      q: "Yaba Lagos",
      limit: 5,
    });
  });
});
