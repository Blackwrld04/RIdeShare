import { BookingStatus } from "@commuteshare/database";

export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

export function holdsSeats(status: BookingStatus): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(
    status as (typeof ACTIVE_BOOKING_STATUSES)[number],
  );
}

export function calculateAvailableSeats(
  passengerSeats: number,
  bookings: ReadonlyArray<{ seats: number; status: BookingStatus }>,
): number {
  const reservedSeats = bookings.reduce(
    (total, booking) =>
      holdsSeats(booking.status) ? total + booking.seats : total,
    0,
  );

  return Math.max(0, passengerSeats - reservedSeats);
}

export function canDriverDecide(status: BookingStatus): boolean {
  return status === BookingStatus.PENDING;
}

export function canPassengerCancel(status: BookingStatus): boolean {
  return holdsSeats(status);
}
