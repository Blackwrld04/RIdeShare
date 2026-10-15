import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "./access-token.guard.js";
import {
  type CreateSocialChallengeInput,
  createSocialChallengeSchema,
  type RefreshSessionInput,
  type RequestOtpInput,
  refreshSessionSchema,
  requestOtpSchema,
  type SocialCredentialInput,
  type SocialProvider,
  socialCredentialSchema,
  socialProviderSchema,
  type VerifyOtpInput,
  verifyOtpSchema,
} from "./auth.schemas.js";
import {
  AuthService,
  type AuthTokensResponse,
  type OtpChallengeResponse,
  type SocialAccountResponse,
  type SocialChallengeResponse,
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

  @Post("social/challenge")
  createSocialChallenge(
    @Body(new ZodValidationPipe(createSocialChallengeSchema))
    input: CreateSocialChallengeInput,
  ): Promise<SocialChallengeResponse> {
    return this.auth.createSocialChallenge(input);
  }

  @Post("social/login")
  socialLogin(
    @Body(new ZodValidationPipe(socialCredentialSchema))
    input: SocialCredentialInput,
  ): Promise<AuthTokensResponse> {
    return this.auth.socialLogin(input);
  }

  @Post("social/accounts")
  @UseGuards(AccessTokenGuard)
  linkSocialAccount(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(socialCredentialSchema))
    input: SocialCredentialInput,
  ): Promise<SocialAccountResponse> {
    return this.auth.linkSocialAccount(request.auth.userId, input);
  }

  @Get("social/accounts")
  @UseGuards(AccessTokenGuard)
  listSocialAccounts(
    @Req() request: AuthenticatedRequest,
  ): Promise<SocialAccountResponse[]> {
    return this.auth.listSocialAccounts(request.auth.userId);
  }

  @Delete("social/accounts/:provider")
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  unlinkSocialAccount(
    @Req() request: AuthenticatedRequest,
    @Param("provider", new ZodValidationPipe(socialProviderSchema))
    provider: SocialProvider,
  ): Promise<void> {
    return this.auth.unlinkSocialAccount(request.auth.userId, provider);
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
