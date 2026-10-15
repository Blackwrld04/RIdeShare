import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type CreateDisputeInput,
  createDisputeSchema,
  disputeBookingIdSchema,
  type ListDisputesInput,
  listDisputesSchema,
} from "./dispute.schemas.js";
import {
  DisputeService,
  type PaymentDisputePageResponse,
  type PaymentDisputeResponse,
} from "./dispute.service.js";

@Controller("disputes")
@UseGuards(AccessTokenGuard)
export class DisputeController {
  constructor(
    @Inject(DisputeService) private readonly disputes: DisputeService,
  ) {}

  @Post("bookings/:bookingId")
  create(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(disputeBookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(createDisputeSchema)) input: CreateDisputeInput,
  ): Promise<PaymentDisputeResponse> {
    return this.disputes.create(request.auth.userId, bookingId, input);
  }

  @Get("mine")
  listMine(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listDisputesSchema))
    input: ListDisputesInput,
  ): Promise<PaymentDisputePageResponse<PaymentDisputeResponse>> {
    return this.disputes.listMine(request.auth.userId, input);
  }
}
