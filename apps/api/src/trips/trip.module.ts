import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BookingModule } from "../bookings/booking.module.js";
import { RideModule } from "../rides/ride.module.js";
import { TripController } from "./trip.controller.js";
import { TripService } from "./trip.service.js";

@Module({
  imports: [AuthModule, BookingModule, RideModule],
  controllers: [TripController],
  providers: [TripService],
})
export class TripModule {}
