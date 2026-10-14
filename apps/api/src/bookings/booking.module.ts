import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentModule } from "../payments/payment.module.js";
import { BookingController } from "./booking.controller.js";
import { BookingService } from "./booking.service.js";

@Module({
  imports: [AuthModule, PaymentModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
