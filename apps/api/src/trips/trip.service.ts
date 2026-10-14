import { Inject, Injectable } from "@nestjs/common";
import {
  type BookingResponse,
  BookingService,
} from "../bookings/booking.service.js";
import { type RideOfferResponse, RideService } from "../rides/ride.service.js";
import {
  getBookingStatusesForView,
  getRideStatusesForView,
  type TripView,
} from "./trip.policy.js";

export interface TripTrackerResponse {
  view: TripView;
  driverRides: RideOfferResponse[];
  passengerBookings: BookingResponse[];
}

@Injectable()
export class TripService {
  constructor(
    @Inject(RideService) private readonly rides: RideService,
    @Inject(BookingService) private readonly bookings: BookingService,
  ) {}

  async getTracker(
    userId: string,
    view: TripView,
  ): Promise<TripTrackerResponse> {
    const [driverRides, passengerBookings] = await Promise.all([
      this.rides.getMine(userId, getRideStatusesForView(view)),
      this.bookings.getMine(userId, getBookingStatusesForView(view)),
    ]);

    return { view, driverRides, passengerBookings };
  }
}
