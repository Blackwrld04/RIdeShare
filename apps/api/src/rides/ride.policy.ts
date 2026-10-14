import { RidePointKind } from "@commuteshare/database";
import type { RideRouteInput, RoutePointInput } from "./ride.schemas.js";

export interface RidePublishSnapshot {
  departureAt: Date;
  passengerSeats: number;
  driverStatus: string;
  vehicleSeatCapacity: number | null;
  routePoints: Array<{ kind: string }>;
}

export interface RoutePointData extends RoutePointInput {
  sequence: number;
  kind: RidePointKind;
}

export function buildRoutePoints(route: RideRouteInput): RoutePointData[] {
  const points: RoutePointData[] = [
    { ...route.origin, sequence: 0, kind: RidePointKind.ORIGIN },
  ];

  route.waypoints.forEach((waypoint, index) => {
    points.push({
      ...waypoint,
      sequence: index + 1,
      kind: RidePointKind.WAYPOINT,
    });
  });

  points.push({
    ...route.destination,
    sequence: points.length,
    kind: RidePointKind.DESTINATION,
  });
  return points;
}

export function getRidePublishIssues(
  ride: RidePublishSnapshot,
  now = new Date(),
): string[] {
  const issues: string[] = [];
  const minimumDeparture = new Date(now.getTime() + 15 * 60 * 1_000);

  if (ride.driverStatus !== "APPROVED") {
    issues.push("driver.approval");
  }

  if (ride.vehicleSeatCapacity === null) {
    issues.push("driver.vehicle");
  } else if (ride.passengerSeats > ride.vehicleSeatCapacity - 1) {
    issues.push("ride.passenger_seats");
  }

  if (ride.departureAt < minimumDeparture) {
    issues.push("ride.departure_at");
  }

  if (!ride.routePoints.some((point) => point.kind === RidePointKind.ORIGIN)) {
    issues.push("route.origin");
  }

  if (
    !ride.routePoints.some((point) => point.kind === RidePointKind.DESTINATION)
  ) {
    issues.push("route.destination");
  }

  return issues;
}
