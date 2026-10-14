import {
  BookingStatus,
  type BookingStatus as BookingStatusValue,
  RideStatus,
  type RideStatus as RideStatusValue,
} from "@commuteshare/database";

export type TripView = "upcoming" | "past" | "cancelled";

const RIDE_STATUSES_BY_VIEW = {
  upcoming: [RideStatus.PUBLISHED, RideStatus.FULL, RideStatus.IN_PROGRESS],
  past: [RideStatus.COMPLETED],
  cancelled: [RideStatus.CANCELLED],
} satisfies Record<TripView, readonly RideStatusValue[]>;

const BOOKING_STATUSES_BY_VIEW = {
  upcoming: [
    BookingStatus.PENDING,
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.CONFIRMED,
    BookingStatus.IN_PROGRESS,
  ],
  past: [BookingStatus.COMPLETED],
  cancelled: [
    BookingStatus.DECLINED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
  ],
} satisfies Record<TripView, readonly BookingStatusValue[]>;

export function canStartRide(status: RideStatusValue): boolean {
  return status === RideStatus.PUBLISHED || status === RideStatus.FULL;
}

export function canCompleteRide(status: RideStatusValue): boolean {
  return status === RideStatus.IN_PROGRESS;
}

export function getRideStatusesForView(view: TripView): RideStatusValue[] {
  return [...RIDE_STATUSES_BY_VIEW[view]];
}

export function getBookingStatusesForView(
  view: TripView,
): BookingStatusValue[] {
  return [...BOOKING_STATUSES_BY_VIEW[view]];
}
