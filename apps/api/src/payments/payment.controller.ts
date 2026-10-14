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
import { type LedgerJournalResponse, LedgerService } from "./ledger.service.js";
import {
  type InitializeCheckoutInput,
  initializeCheckoutSchema,
  paymentIdSchema,
  refundIdSchema,
} from "./payment.schemas.js";
import {
  type PaymentResponse,
  PaymentService,
  type RefundResponse,
} from "./payment.service.js";

@Controller("payments")
@UseGuards(AccessTokenGuard)
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly payments: PaymentService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

  @Post("checkout")
  initializeCheckout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(initializeCheckoutSchema))
    input: InitializeCheckoutInput,
  ): Promise<PaymentResponse> {
    return this.payments.initializeCheckout(request.auth.userId, input);
  }

  @Get("ledger/mine")
  getLedger(
    @Req() request: AuthenticatedRequest,
  ): Promise<LedgerJournalResponse[]> {
    return this.ledger.getMine(request.auth.userId);
  }

  @Get("refunds/:refundId")
  getRefund(
    @Req() request: AuthenticatedRequest,
    @Param("refundId", new ZodValidationPipe(refundIdSchema))
    refundId: string,
  ): Promise<RefundResponse> {
    return this.payments.getRefund(request.auth.userId, refundId);
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
