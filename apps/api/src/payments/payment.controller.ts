import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type InitializeCheckoutInput,
  initializeCheckoutSchema,
  paymentIdSchema,
} from "./payment.schemas.js";
import { type PaymentResponse, PaymentService } from "./payment.service.js";

@Controller("payments")
@UseGuards(AccessTokenGuard)
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  @Post("checkout")
  initializeCheckout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(initializeCheckoutSchema))
    input: InitializeCheckoutInput,
  ): Promise<PaymentResponse> {
    return this.payments.initializeCheckout(request.auth.userId, input);
  }

  @Get(":paymentId")
  get(
    @Req() request: AuthenticatedRequest,
    @Param("paymentId", new ZodValidationPipe(paymentIdSchema))
    paymentId: string,
  ): Promise<PaymentResponse> {
    return this.payments.get(request.auth.userId, paymentId);
  }
}
