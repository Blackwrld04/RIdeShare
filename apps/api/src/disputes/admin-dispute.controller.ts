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
import { AdminGuard } from "../admin/admin.guard.js";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  disputeIdSchema,
  type ListDisputesInput,
  listDisputesSchema,
  type ResolveDisputeInput,
  resolveDisputeSchema,
} from "./dispute.schemas.js";
import {
  type AdminPaymentDisputeResponse,
  DisputeService,
  type PaymentDisputePageResponse,
} from "./dispute.service.js";

@Controller("admin/disputes")
@UseGuards(AccessTokenGuard, AdminGuard)
export class AdminDisputeController {
  constructor(
    @Inject(DisputeService) private readonly disputes: DisputeService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listDisputesSchema))
    input: ListDisputesInput,
  ): Promise<PaymentDisputePageResponse<AdminPaymentDisputeResponse>> {
    return this.disputes.listAdmin(input);
  }

  @Get(":disputeId")
  get(
    @Param("disputeId", new ZodValidationPipe(disputeIdSchema))
    disputeId: string,
  ): Promise<AdminPaymentDisputeResponse> {
    return this.disputes.getAdmin(disputeId);
  }

  @Post(":disputeId/resolve")
  resolve(
    @Req() request: AuthenticatedRequest,
    @Param("disputeId", new ZodValidationPipe(disputeIdSchema))
    disputeId: string,
    @Body(new ZodValidationPipe(resolveDisputeSchema))
    input: ResolveDisputeInput,
  ): Promise<AdminPaymentDisputeResponse> {
    return this.disputes.resolve(request.auth.userId, disputeId, input);
  }
}
