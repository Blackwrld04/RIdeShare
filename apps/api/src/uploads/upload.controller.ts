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
  type CreateUploadInput,
  createUploadSchema,
  uploadIdSchema,
} from "./upload.schemas.js";
import {
  type CreateUploadResponse,
  type UploadResponse,
  UploadService,
} from "./upload.service.js";

@Controller("uploads")
@UseGuards(AccessTokenGuard)
export class UploadController {
  constructor(@Inject(UploadService) private readonly uploads: UploadService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createUploadSchema)) input: CreateUploadInput,
  ): Promise<CreateUploadResponse> {
    return this.uploads.create(request.auth.userId, input);
  }

  @Get(":uploadId")
  get(
    @Req() request: AuthenticatedRequest,
    @Param("uploadId", new ZodValidationPipe(uploadIdSchema)) uploadId: string,
  ): Promise<UploadResponse> {
    return this.uploads.get(request.auth.userId, uploadId);
  }

  @Post(":uploadId/complete")
  complete(
    @Req() request: AuthenticatedRequest,
    @Param("uploadId", new ZodValidationPipe(uploadIdSchema)) uploadId: string,
  ): Promise<UploadResponse> {
    return this.uploads.complete(request.auth.userId, uploadId);
  }
}
