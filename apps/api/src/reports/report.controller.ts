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
  type CreateReportInput,
  createReportSchema,
  type ListMyReportsInput,
  listMyReportsSchema,
  reportBookingIdSchema,
} from "./report.schemas.js";
import {
  ReportService,
  type UserReportPageResponse,
  type UserReportResponse,
} from "./report.service.js";

@Controller("reports")
@UseGuards(AccessTokenGuard)
export class ReportController {
  constructor(@Inject(ReportService) private readonly reports: ReportService) {}

  @Post("bookings/:bookingId")
  create(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(reportBookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(createReportSchema)) input: CreateReportInput,
  ): Promise<UserReportResponse> {
    return this.reports.create(request.auth.userId, bookingId, input);
  }

  @Get("mine")
  listMine(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listMyReportsSchema))
    input: ListMyReportsInput,
  ): Promise<UserReportPageResponse> {
    return this.reports.listMine(request.auth.userId, input);
  }
}
