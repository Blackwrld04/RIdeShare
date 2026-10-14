import type { AppConfig } from "@commuteshare/config";
import { Module, type Provider } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { APP_CONFIG } from "../config.provider.js";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import { HttpPaystackClient, PaystackClient } from "./paystack.client.js";
import { PaystackWebhookController } from "./paystack-webhook.controller.js";

const paystackClientProvider: Provider<PaystackClient> = {
  provide: PaystackClient,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => new HttpPaystackClient(config),
};

@Module({
  imports: [AuthModule],
  controllers: [PaymentController, PaystackWebhookController],
  providers: [paystackClientProvider, PaymentService],
  exports: [PaystackClient, PaymentService],
})
export class PaymentModule {}
