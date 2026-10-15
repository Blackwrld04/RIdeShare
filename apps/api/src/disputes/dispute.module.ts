import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentModule } from "../payments/payment.module.js";
import { AdminDisputeController } from "./admin-dispute.controller.js";
import { DisputeController } from "./dispute.controller.js";
import { DisputeService } from "./dispute.service.js";

@Module({
  imports: [AuthModule, AdminModule, PaymentModule],
  controllers: [DisputeController, AdminDisputeController],
  providers: [DisputeService],
})
export class DisputeModule {}
