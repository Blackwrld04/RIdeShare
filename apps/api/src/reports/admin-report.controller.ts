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
  type ListAdminReportsInput,
  listAdminReportsSchema,
  type ReviewReportInput,
  reportIdSchema,
  reviewReportSchema,
} from "./report.schemas.js";
import {
  type AdminUserReportPageResponse,
  type AdminUserReportResponse,
  ReportService,
} from "./report.service.js";

@Controller("admin/reports")
@UseGuards(AccessTokenGuard, AdminGuard)
export class AdminReportController {
  constructor(@Inject(ReportService) private readonly reports: ReportService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAdminReportsSchema))
    input: ListAdminReportsInput,
  ): Promise<AdminUserReportPageResponse> {
    return this.reports.listAdmin(input);
  }

  @Get(":reportId")
  get(
    @Param("reportId", new ZodValidationPipe(reportIdSchema)) reportId: string,
  ): Promise<AdminUserReportResponse> {
    return this.reports.getAdmin(reportId);
  }

  @Post(":reportId/review")
  review(
    @Req() request: AuthenticatedRequest,
    @Param("reportId", new ZodValidationPipe(reportIdSchema)) reportId: string,
    @Body(new ZodValidationPipe(reviewReportSchema)) input: ReviewReportInput,
  ): Promise<AdminUserReportResponse> {
    return this.reports.review(request.auth.userId, reportId, input);
  }
}
