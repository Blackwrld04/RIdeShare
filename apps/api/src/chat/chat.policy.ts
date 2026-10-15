import { BookingStatus, RideStatus } from "@commuteshare/database";

export const CHAT_READABLE_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.DISPUTED,
  BookingStatus.CANCELLED,
] as const;

const readableBookingStatuses = new Set<BookingStatus>(
  CHAT_READABLE_BOOKING_STATUSES,
);
const writableBookingStatuses = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
]);
const writableRideStatuses = new Set<RideStatus>([
  RideStatus.PUBLISHED,
  RideStatus.FULL,
  RideStatus.IN_PROGRESS,
]);

export function canReadChat(bookingStatus: BookingStatus): boolean {
  return readableBookingStatuses.has(bookingStatus);
}

export function canSendChatMessage(
  bookingStatus: BookingStatus,
  rideStatus: RideStatus,
): boolean {
  return (
    writableBookingStatuses.has(bookingStatus) &&
    writableRideStatuses.has(rideStatus)
  );
}
