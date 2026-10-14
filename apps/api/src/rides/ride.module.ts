import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentModule } from "../payments/payment.module.js";
import { RideController } from "./ride.controller.js";
import { RideService } from "./ride.service.js";
import { RideSeriesController } from "./ride-series.controller.js";
import { RideSeriesService } from "./ride-series.service.js";
import { RideSeriesQueueService } from "./ride-series-queue.service.js";

@Module({
  imports: [AuthModule, PaymentModule],
  controllers: [RideController, RideSeriesController],
  providers: [RideService, RideSeriesQueueService, RideSeriesService],
  exports: [RideService],
})
export class RideModule {}
