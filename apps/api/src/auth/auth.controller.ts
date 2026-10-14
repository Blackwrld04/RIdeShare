import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type RefreshSessionInput,
  type RequestOtpInput,
  refreshSessionSchema,
  requestOtpSchema,
  type VerifyOtpInput,
  verifyOtpSchema,
} from "./auth.schemas.js";
import {
  AuthService,
  type AuthTokensResponse,
  type OtpChallengeResponse,
} from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("otp/request")
  @HttpCode(202)
  requestOtp(
    @Body(new ZodValidationPipe(requestOtpSchema)) input: RequestOtpInput,
  ): Promise<OtpChallengeResponse> {
    return this.auth.requestOtp(input);
  }

  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) input: VerifyOtpInput,
  ): Promise<AuthTokensResponse> {
    return this.auth.verifyOtp(input);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshSessionSchema))
    input: RefreshSessionInput,
  ): ReturnType<AuthService["refreshSession"]> {
    return this.auth.refreshSession(input);
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Body(new ZodValidationPipe(refreshSessionSchema))
    input: RefreshSessionInput,
  ): Promise<void> {
    await this.auth.logout(input);
  }
}
