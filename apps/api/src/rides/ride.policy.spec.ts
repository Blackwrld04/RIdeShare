import { DriverApplicationStatus, RidePointKind } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import {
  buildRoutePoints,
  calculateMaximumContributionKobo,
  calculateSegmentContribution,
  getRidePublishIssues,
  getRideStartTimingIssue,
  isRouteGeometryAligned,
} from "./ride.policy.js";

describe("ride policy", () => {
  it("orders origin, waypoints, and destination", () => {
    const points = buildRoutePoints({
      origin: { label: "Yaba", latitude: 6.5095, longitude: 3.3711 },
      waypoints: [{ label: "Obalende", latitude: 6.45, longitude: 3.41 }],
      destination: { label: "Marina", latitude: 6.4541, longitude: 3.3947 },
    });

    expect(points.map(({ kind, sequence }) => ({ kind, sequence }))).toEqual([
      { kind: RidePointKind.ORIGIN, sequence: 0 },
      { kind: RidePointKind.WAYPOINT, sequence: 1 },
      { kind: RidePointKind.DESTINATION, sequence: 2 },
    ]);
  });

  it("accepts a publishable ride", () => {
    expect(
      getRidePublishIssues(
        {
          departureAt: new Date("2026-10-14T12:30:00.000Z"),
          passengerSeats: 3,
          driverStatus: DriverApplicationStatus.APPROVED,
          bankAccountStatus: "VERIFIED",
          vehicleSeatCapacity: 5,
          routePoints: [
            { kind: RidePointKind.ORIGIN },
            { kind: RidePointKind.DESTINATION },
          ],
          routePathPointCount: 3,
          routeDistanceMeters: 12_000,
          routeDurationSeconds: 1_800,
          contributionKobo: 300_000,
          maximumContributionKobo: 600_000,
        },
        new Date("2026-10-14T12:00:00.000Z"),
      ),
    ).toEqual([]);
  });

  it("reports approval, capacity, timing, and route issues", () => {
    expect(
      getRidePublishIssues(
        {
          departureAt: new Date("2026-10-14T12:10:00.000Z"),
          passengerSeats: 4,
          driverStatus: DriverApplicationStatus.SUSPENDED,
          bankAccountStatus: null,
          vehicleSeatCapacity: 4,
          routePoints: [],
          routePathPointCount: 0,
          routeDistanceMeters: null,
          routeDurationSeconds: null,
          contributionKobo: 700_000,
          maximumContributionKobo: 600_000,
        },
        new Date("2026-10-14T12:00:00.000Z"),
      ),
    ).toEqual([
      "driver.approval",
      "driver.bank_account",
      "ride.passenger_seats",
      "ride.departure_at",
      "route.origin",
      "route.destination",
      "route.corridor",
      "ride.contribution_cap",
    ]);
  });

  it("accepts an OSM route path aligned with its landmarks", () => {
    expect(
      isRouteGeometryAligned({
        origin: { label: "Yaba", latitude: 6.5095, longitude: 3.3711 },
        waypoints: [{ label: "Obalende", latitude: 6.45, longitude: 3.41 }],
        destination: {
          label: "Marina",
          latitude: 6.4541,
          longitude: 3.3947,
        },
        path: [
          { latitude: 6.5095, longitude: 3.3711 },
          { latitude: 6.45, longitude: 3.41 },
          { latitude: 6.4541, longitude: 3.3947 },
        ],
        distanceMeters: 12_000,
        durationSeconds: 1_800,
        routingSource: "osrm",
      }),
    ).toBe(true);
  });

  it("prices only the passenger segment with a configurable floor", () => {
    expect(calculateSegmentContribution(300_000, 0.25, 0.75, 50_000)).toBe(
      150_000,
    );
    expect(calculateSegmentContribution(300_000, 0.1, 0.15, 50_000)).toBe(
      50_000,
    );
    expect(calculateSegmentContribution(0, 0.1, 0.9, 50_000)).toBe(0);
  });

  it("caps contributions by route distance and an absolute ceiling", () => {
    expect(calculateMaximumContributionKobo(8_200, 50_000, 5_000_000)).toBe(
      450_000,
    );
    expect(calculateMaximumContributionKobo(200_000, 50_000, 5_000_000)).toBe(
      5_000_000,
    );
  });

  it("bounds ride starts around departure with traffic grace", () => {
    const departure = new Date("2026-10-14T12:00:00.000Z");
    expect(
      getRideStartTimingIssue(
        departure,
        60,
        30,
        new Date("2026-10-14T10:59:59.000Z"),
      ),
    ).toBe("too_early");
    expect(
      getRideStartTimingIssue(
        departure,
        60,
        30,
        new Date("2026-10-14T12:20:00.000Z"),
      ),
    ).toBeNull();
    expect(
      getRideStartTimingIssue(
        departure,
        60,
        30,
        new Date("2026-10-14T12:30:01.000Z"),
      ),
    ).toBe("grace_expired");
  });
});
