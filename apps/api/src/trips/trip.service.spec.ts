import { BookingStatus, RideStatus } from "@commuteshare/database";
import { describe, expect, it, vi } from "vitest";
import type { BookingService } from "../bookings/booking.service.js";
import type { RideService } from "../rides/ride.service.js";
import { TripService } from "./trip.service.js";

describe("trip service", () => {
  it("loads both driver and passenger upcoming trips", async () => {
    const rides = { getMine: vi.fn().mockResolvedValue([]) };
    const bookings = { getMine: vi.fn().mockResolvedValue([]) };
    const service = new TripService(
      rides as unknown as RideService,
      bookings as unknown as BookingService,
    );

    await expect(service.getTracker("user-id", "upcoming")).resolves.toEqual({
      view: "upcoming",
      driverRides: [],
      passengerBookings: [],
    });
    expect(rides.getMine).toHaveBeenCalledWith("user-id", [
      RideStatus.PUBLISHED,
      RideStatus.FULL,
      RideStatus.IN_PROGRESS,
    ]);
    expect(bookings.getMine).toHaveBeenCalledWith("user-id", [
      BookingStatus.PENDING,
      BookingStatus.AWAITING_PAYMENT,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ]);
  });
});
