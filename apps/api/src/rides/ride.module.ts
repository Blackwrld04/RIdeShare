import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentModule } from "../payments/payment.module.js";
import { RideController } from "./ride.controller.js";
import { RideService } from "./ride.service.js";

@Module({
  imports: [AuthModule, PaymentModule],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService],
})
export class RideModule {}
