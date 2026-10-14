import { describe, expect, it } from "vitest";
import {
  createRideSchema,
  rideRouteSchema,
  routePointSchema,
  updateRideSchema,
} from "./ride.schemas.js";

const origin = {
  label: "Yaba Bus Stop",
  address: "Herbert Macaulay Way, Lagos",
  latitude: 6.5095,
  longitude: 3.3711,
  externalSource: "openstreetmap",
  externalId: "node:123",
};

const destination = {
  label: "Marina",
  latitude: 6.4541,
  longitude: 3.3947,
};

describe("ride schemas", () => {
  it("accepts provider-neutral route points with optional OSM metadata", () => {
    expect(routePointSchema.parse(origin)).toEqual(origin);
  });

  it("rejects coordinates outside geographic bounds", () => {
    expect(
      routePointSchema.safeParse({
        ...origin,
        latitude: 91,
      }).success,
    ).toBe(false);
  });

  it("rejects identical route endpoints", () => {
    expect(
      rideRouteSchema.safeParse({
        origin,
        destination: origin,
      }).success,
    ).toBe(false);
  });

  it("applies Nigeria defaults to a new ride", () => {
    const ride = createRideSchema.parse({
      departureAt: "2026-10-15T07:30:00+01:00",
      passengerSeats: 3,
      contributionKobo: 250_000,
      route: { origin, destination },
    });

    expect(ride.timezone).toBe("Africa/Lagos");
    expect(ride.currency).toBe("NGN");
    expect(ride.route.waypoints).toEqual([]);
  });

  it("rejects an empty ride patch", () => {
    expect(updateRideSchema.safeParse({}).success).toBe(false);
  });
});
