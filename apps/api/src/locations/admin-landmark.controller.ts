import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../admin/admin.guard.js";
import { AccessTokenGuard } from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type CreateLandmarkInput,
  createLandmarkSchema,
  landmarkIdSchema,
  type UpdateLandmarkInput,
  updateLandmarkSchema,
} from "./location.schemas.js";
import { LocationService } from "./location.service.js";

@Controller("admin/landmarks")
@UseGuards(AccessTokenGuard, AdminGuard)
export class AdminLandmarkController {
  constructor(
    @Inject(LocationService) private readonly locations: LocationService,
  ) {}

  @Get()
  list() {
    return this.locations.listAdmin();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createLandmarkSchema))
    input: CreateLandmarkInput,
  ) {
    return this.locations.create(input);
  }

  @Patch(":landmarkId")
  update(
    @Param("landmarkId", new ZodValidationPipe(landmarkIdSchema))
    landmarkId: string,
    @Body(new ZodValidationPipe(updateLandmarkSchema))
    input: UpdateLandmarkInput,
  ) {
    return this.locations.update(landmarkId, input);
  }
}
