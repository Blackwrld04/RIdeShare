import { BookingStatus, RideStatus } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import {
  canCompleteRide,
  canStartRide,
  getBookingStatusesForView,
  getRideStatusesForView,
} from "./trip.policy.js";

describe("trip policy", () => {
  it.each([RideStatus.PUBLISHED, RideStatus.FULL])(
    "allows %s rides to start",
    (status) => {
      expect(canStartRide(status)).toBe(true);
    },
  );

  it("only completes rides in progress", () => {
    expect(canCompleteRide(RideStatus.IN_PROGRESS)).toBe(true);
    expect(canCompleteRide(RideStatus.PUBLISHED)).toBe(false);
    expect(canCompleteRide(RideStatus.COMPLETED)).toBe(false);
  });

  it("maps active rides and bookings to upcoming", () => {
    expect(getRideStatusesForView("upcoming")).toEqual([
      RideStatus.PUBLISHED,
      RideStatus.FULL,
      RideStatus.IN_PROGRESS,
    ]);
    expect(getBookingStatusesForView("upcoming")).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ]);
  });

  it("maps terminal states to past and cancelled", () => {
    expect(getRideStatusesForView("past")).toEqual([RideStatus.COMPLETED]);
    expect(getBookingStatusesForView("past")).toEqual([
      BookingStatus.COMPLETED,
    ]);
    expect(getRideStatusesForView("cancelled")).toEqual([RideStatus.CANCELLED]);
    expect(getBookingStatusesForView("cancelled")).toEqual([
      BookingStatus.DECLINED,
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
    ]);
  });
});
