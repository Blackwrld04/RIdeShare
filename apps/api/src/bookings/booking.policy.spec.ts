import { BookingStatus } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import {
  calculateAvailableSeats,
  canDriverDecide,
  canPassengerCancel,
  holdsSeats,
} from "./booking.policy.js";

describe("booking policy", () => {
  it.each([
    BookingStatus.PENDING,
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.CONFIRMED,
  ])("holds seats for %s bookings", (status) => {
    expect(holdsSeats(status)).toBe(true);
  });

  it.each([
    BookingStatus.DECLINED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
  ])("releases seats for %s bookings", (status) => {
    expect(holdsSeats(status)).toBe(false);
  });

  it("calculates remaining seats from active bookings", () => {
    expect(
      calculateAvailableSeats(4, [
        { seats: 1, status: BookingStatus.PENDING },
        { seats: 2, status: BookingStatus.CONFIRMED },
        { seats: 1, status: BookingStatus.CANCELLED },
      ]),
    ).toBe(1);
  });

  it("does not return negative availability", () => {
    expect(
      calculateAvailableSeats(2, [
        { seats: 3, status: BookingStatus.CONFIRMED },
      ]),
    ).toBe(0);
  });

  it("limits driver decisions to pending bookings", () => {
    expect(canDriverDecide(BookingStatus.PENDING)).toBe(true);
    expect(canDriverDecide(BookingStatus.CONFIRMED)).toBe(false);
  });

  it("allows passengers to cancel active bookings", () => {
    expect(canPassengerCancel(BookingStatus.PENDING)).toBe(true);
    expect(canPassengerCancel(BookingStatus.CONFIRMED)).toBe(true);
    expect(canPassengerCancel(BookingStatus.DECLINED)).toBe(false);
  });
});
