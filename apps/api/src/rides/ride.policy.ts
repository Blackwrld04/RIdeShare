import { RidePointKind } from "@commuteshare/database";
import type { RideRouteInput, RoutePointInput } from "./ride.schemas.js";

export interface RidePublishSnapshot {
  departureAt: Date;
  passengerSeats: number;
  driverStatus: string;
  bankAccountStatus: string | null;
  vehicleSeatCapacity: number | null;
  routePoints: Array<{ kind: string }>;
  routePathPointCount: number;
  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;
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

  if (ride.bankAccountStatus !== "VERIFIED") {
    issues.push("driver.bank_account");
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

  if (
    ride.routePathPointCount < 2 ||
    !ride.routeDistanceMeters ||
    !ride.routeDurationSeconds
  ) {
    issues.push("route.corridor");
  }

  return issues;
}

export function isRouteGeometryAligned(
  route: RideRouteInput,
  toleranceMeters = 2_000,
): boolean {
  if (!route.path || route.path.length < 2) {
    return true;
  }

  const requiredPoints = [route.origin, ...route.waypoints, route.destination];
  const first = route.path[0];
  const last = route.path.at(-1);

  if (!first || !last) {
    return false;
  }

  if (
    distanceMeters(first, route.origin) > toleranceMeters ||
    distanceMeters(last, route.destination) > toleranceMeters
  ) {
    return false;
  }

  return requiredPoints.every((point) =>
    route.path?.some(
      (pathPoint) => distanceMeters(pathPoint, point) <= toleranceMeters,
    ),
  );
}

export function calculateSegmentContribution(
  fullContributionKobo: number,
  pickupRouteFraction: number,
  dropoffRouteFraction: number,
  minimumContributionKobo: number,
): number {
  if (fullContributionKobo <= 0) {
    return 0;
  }

  const fraction = Math.max(
    0,
    Math.min(1, dropoffRouteFraction - pickupRouteFraction),
  );
  const proportional = Math.ceil((fullContributionKobo * fraction) / 100) * 100;

  return Math.min(
    fullContributionKobo,
    Math.max(minimumContributionKobo, proportional),
  );
}

function distanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (second.latitude - first.latitude) * radians;
  const longitudeDelta = (second.longitude - first.longitude) * radians;
  const firstLatitude = first.latitude * radians;
  const secondLatitude = second.latitude * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}
