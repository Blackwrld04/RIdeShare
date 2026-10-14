import { DriverApplicationStatus, RidePointKind } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import { buildRoutePoints, getRidePublishIssues } from "./ride.policy.js";

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
          vehicleSeatCapacity: 5,
          routePoints: [
            { kind: RidePointKind.ORIGIN },
            { kind: RidePointKind.DESTINATION },
          ],
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
          vehicleSeatCapacity: 4,
          routePoints: [],
        },
        new Date("2026-10-14T12:00:00.000Z"),
      ),
    ).toEqual([
      "driver.approval",
      "ride.passenger_seats",
      "ride.departure_at",
      "route.origin",
      "route.destination",
    ]);
  });
});
