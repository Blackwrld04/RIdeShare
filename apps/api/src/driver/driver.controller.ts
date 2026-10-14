import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  driverDocumentKindSchema,
  type UpdateDriverDetailsInput,
  type UpsertDriverDocumentInput,
  type UpsertDriverVehicleInput,
  updateDriverDetailsSchema,
  upsertDriverDocumentSchema,
  upsertDriverVehicleSchema,
} from "./driver.schemas.js";
import {
  type DriverApplicationResponse,
  DriverService,
} from "./driver.service.js";

@Controller("driver")
@UseGuards(AccessTokenGuard)
export class DriverController {
  constructor(@Inject(DriverService) private readonly drivers: DriverService) {}

  @Put("application")
  ensureApplication(
    @Req() request: AuthenticatedRequest,
  ): Promise<DriverApplicationResponse> {
    return this.drivers.ensureApplication(request.auth.userId);
  }

  @Get("application")
  getApplication(
    @Req() request: AuthenticatedRequest,
  ): Promise<DriverApplicationResponse> {
    return this.drivers.getApplication(request.auth.userId);
  }

  @Patch("application")
  updateDetails(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateDriverDetailsSchema))
    input: UpdateDriverDetailsInput,
  ): Promise<DriverApplicationResponse> {
    return this.drivers.updateDetails(request.auth.userId, input);
  }

  @Put("application/vehicle")
  upsertVehicle(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(upsertDriverVehicleSchema))
    input: UpsertDriverVehicleInput,
  ): Promise<DriverApplicationResponse> {
    return this.drivers.upsertVehicle(request.auth.userId, input);
  }

  @Put("application/documents/:kind")
  upsertDocument(
    @Req() request: AuthenticatedRequest,
    @Param("kind", new ZodValidationPipe(driverDocumentKindSchema))
    kind: string,
    @Body(new ZodValidationPipe(upsertDriverDocumentSchema))
    input: UpsertDriverDocumentInput,
  ): Promise<DriverApplicationResponse> {
    return this.drivers.upsertDocument(request.auth.userId, kind, input);
  }

  @Delete("application/documents/:kind")
  @HttpCode(204)
  async deleteDocument(
    @Req() request: AuthenticatedRequest,
    @Param("kind", new ZodValidationPipe(driverDocumentKindSchema))
    kind: string,
  ): Promise<void> {
    await this.drivers.deleteDocument(request.auth.userId, kind);
  }

  @Post("application/submit")
  @HttpCode(200)
  submit(
    @Req() request: AuthenticatedRequest,
  ): Promise<DriverApplicationResponse> {
    return this.drivers.submit(request.auth.userId);
  }
}
