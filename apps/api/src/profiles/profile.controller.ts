import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type UpdateProfileInput,
  updateProfileSchema,
} from "./profile.schemas.js";
import { type ProfileResponse, ProfileService } from "./profile.service.js";

@Controller("profile")
@UseGuards(AccessTokenGuard)
export class ProfileController {
  constructor(
    @Inject(ProfileService) private readonly profiles: ProfileService,
  ) {}

  @Get()
  get(@Req() request: AuthenticatedRequest): Promise<ProfileResponse> {
    return this.profiles.get(request.auth.userId);
  }

  @Patch()
  update(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateProfileSchema)) input: UpdateProfileInput,
  ): Promise<ProfileResponse> {
    return this.profiles.update(request.auth.userId, input);
  }
}
