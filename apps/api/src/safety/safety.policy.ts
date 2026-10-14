import {
  BookingStatus,
  type BookingStatus as BookingStatusValue,
  RideStatus,
  type RideStatus as RideStatusValue,
} from "@commuteshare/database";

export const SAFETY_PARTICIPANT_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
] as const;
const participantBookingStatuses = new Set<BookingStatusValue>(
  SAFETY_PARTICIPANT_BOOKING_STATUSES,
);
const shareableRideStatuses = new Set<RideStatusValue>([
  RideStatus.PUBLISHED,
  RideStatus.FULL,
  RideStatus.IN_PROGRESS,
]);

export function isSafetyParticipant(
  isDriver: boolean,
  bookingStatus: BookingStatusValue | null,
): boolean {
  return (
    isDriver ||
    (bookingStatus !== null && participantBookingStatuses.has(bookingStatus))
  );
}

export function canCreateTripShare(rideStatus: RideStatusValue): boolean {
  return shareableRideStatuses.has(rideStatus);
}

export function canRecordTripLocation(rideStatus: RideStatusValue): boolean {
  return rideStatus === RideStatus.IN_PROGRESS;
}

export function canTriggerSos(
  rideStatus: RideStatusValue,
  departureAt: Date,
  now = new Date(),
): boolean {
  if (rideStatus === RideStatus.IN_PROGRESS) {
    return true;
  }
  if (rideStatus !== RideStatus.PUBLISHED && rideStatus !== RideStatus.FULL) {
    return false;
  }
  const millisecondsFromDeparture = now.getTime() - departureAt.getTime();
  return (
    millisecondsFromDeparture >= -2 * 60 * 60 * 1_000 &&
    millisecondsFromDeparture <= 6 * 60 * 60 * 1_000
  );
}
