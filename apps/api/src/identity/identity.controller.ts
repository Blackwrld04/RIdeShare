import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import { type VerifyNinInput, verifyNinSchema } from "./identity.schemas.js";
import {
  IdentityService,
  type IdentityVerificationState,
} from "./identity.service.js";

@Controller("identity/nin")
@UseGuards(AccessTokenGuard)
export class IdentityController {
  constructor(
    @Inject(IdentityService) private readonly identities: IdentityService,
  ) {}

  @Get()
  get(
    @Req() request: AuthenticatedRequest,
  ): Promise<IdentityVerificationState> {
    return this.identities.get(request.auth.userId);
  }

  @Post("verify")
  @HttpCode(200)
  verify(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(verifyNinSchema)) input: VerifyNinInput,
  ): Promise<IdentityVerificationState> {
    return this.identities.verify(request.auth.userId, input);
  }
}
