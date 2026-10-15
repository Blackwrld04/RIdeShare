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
import { AdminGuard } from "./admin.guard.js";
import {
  adminApplicationIdSchema,
  adminDocumentIdSchema,
  type ListAdminApplicationsInput,
  listAdminApplicationsSchema,
  type ReviewDecisionInput,
  reviewDecisionSchema,
} from "./admin.schemas.js";
import { AdminService } from "./admin.service.js";

@Controller("admin/driver-applications")
@UseGuards(AccessTokenGuard, AdminGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listAdminApplicationsSchema))
    input: ListAdminApplicationsInput,
  ) {
    return this.admin.listApplications(input);
  }

  @Get(":applicationId")
  get(
    @Param("applicationId", new ZodValidationPipe(adminApplicationIdSchema))
    applicationId: string,
  ) {
    return this.admin.getApplication(applicationId);
  }

  @Get(":applicationId/documents/:documentId/download")
  downloadDocument(
    @Param("applicationId", new ZodValidationPipe(adminApplicationIdSchema))
    applicationId: string,
    @Param("documentId", new ZodValidationPipe(adminDocumentIdSchema))
    documentId: string,
  ) {
    return this.admin.getDocumentDownload(applicationId, documentId);
  }

  @Post(":applicationId/documents/:documentId/review")
  reviewDocument(
    @Req() request: AuthenticatedRequest,
    @Param("applicationId", new ZodValidationPipe(adminApplicationIdSchema))
    applicationId: string,
    @Param("documentId", new ZodValidationPipe(adminDocumentIdSchema))
    documentId: string,
    @Body(new ZodValidationPipe(reviewDecisionSchema))
    input: ReviewDecisionInput,
  ) {
    return this.admin.reviewDocument(
      request.auth.userId,
      applicationId,
      documentId,
      input,
    );
  }

  @Post(":applicationId/review")
  reviewApplication(
    @Req() request: AuthenticatedRequest,
    @Param("applicationId", new ZodValidationPipe(adminApplicationIdSchema))
    applicationId: string,
    @Body(new ZodValidationPipe(reviewDecisionSchema))
    input: ReviewDecisionInput,
  ) {
    return this.admin.reviewApplication(
      request.auth.userId,
      applicationId,
      input,
    );
  }
}
