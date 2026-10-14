import type { AppConfig } from "@commuteshare/config";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  type RawBodyRequest,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { APP_CONFIG } from "../config.provider.js";
import { verifyPaystackSignature } from "./payment.policy.js";
import { paystackWebhookSchema } from "./payment.schemas.js";
import { PaymentService } from "./payment.service.js";

@Controller("payments/webhooks")
export class PaystackWebhookController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  @Post("paystack")
  @HttpCode(200)
  async handle(
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers("x-paystack-signature") signature: string | undefined,
    @Body() body: unknown,
  ): Promise<{ received: true }> {
    if (
      !request.rawBody ||
      !signature ||
      !verifyPaystackSignature(
        request.rawBody,
        signature,
        this.config.PAYSTACK_SECRET_KEY,
      )
    ) {
      throw new UnauthorizedException("Invalid Paystack signature");
    }

    const event = paystackWebhookSchema.safeParse(body);

    if (!event.success) {
      throw new BadRequestException("Invalid Paystack event");
    }

    await this.payments.handlePaystackWebhook(event.data);
    return { received: true };
  }
}
