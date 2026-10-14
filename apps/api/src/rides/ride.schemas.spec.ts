import { describe, expect, it } from "vitest";
import {
  createRideSchema,
  rideRouteSchema,
  routePointSchema,
  searchRidesSchema,
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

  it("accepts provider-neutral route geometry for Leaflet clients", () => {
    const route = rideRouteSchema.parse({
      origin,
      destination,
      path: [
        { latitude: 6.5095, longitude: 3.3711 },
        { latitude: 6.4541, longitude: 3.3947 },
      ],
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      routingSource: "osrm",
      routingProfile: "driving",
    });

    expect(route).toMatchObject({
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      routingSource: "osrm",
    });
  });

  it("rejects incomplete route geometry", () => {
    expect(
      rideRouteSchema.safeParse({
        origin,
        destination,
        path: [
          { latitude: 6.5095, longitude: 3.3711 },
          { latitude: 6.4541, longitude: 3.3947 },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty ride patch", () => {
    expect(updateRideSchema.safeParse({}).success).toBe(false);
  });

  it("coerces bounded proximity search parameters", () => {
    const search = searchRidesSchema.parse({
      originLatitude: "6.5095",
      originLongitude: "3.3711",
      destinationLatitude: "6.4541",
      destinationLongitude: "3.3947",
    });

    expect(search).toMatchObject({
      radiusMeters: 5_000,
      seats: 1,
      limit: 20,
    });
  });

  it("rejects oversized ride searches", () => {
    expect(
      searchRidesSchema.safeParse({
        originLatitude: "6.5095",
        originLongitude: "3.3711",
        destinationLatitude: "6.4541",
        destinationLongitude: "3.3947",
        radiusMeters: "50000",
      }).success,
    ).toBe(false);
  });
});
