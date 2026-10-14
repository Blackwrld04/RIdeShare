import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentModule } from "../payments/payment.module.js";
import { BankController } from "./bank.controller.js";
import { BankService } from "./bank.service.js";

@Module({
  imports: [AuthModule, PaymentModule],
  controllers: [BankController],
  providers: [BankService],
})
export class BankModule {}
