import type { AppConfig } from "@commuteshare/config";
import { Module, type Provider } from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { AccessTokenGuard } from "./access-token.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { createOtpDelivery, OtpDelivery } from "./otp-delivery.js";
import {
  JoseSocialIdentityVerifier,
  SocialIdentityVerifier,
} from "./social-identity.verifier.js";
import { TokenService } from "./token.service.js";

const otpDeliveryProvider: Provider<OtpDelivery> = {
  provide: OtpDelivery,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => createOtpDelivery(config),
};

const socialIdentityProvider: Provider<SocialIdentityVerifier> = {
  provide: SocialIdentityVerifier,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => new JoseSocialIdentityVerifier(config),
};

@Module({
  controllers: [AuthController],
  providers: [
    otpDeliveryProvider,
    socialIdentityProvider,
    TokenService,
    AuthService,
    AccessTokenGuard,
  ],
  exports: [TokenService, AccessTokenGuard],
})
export class AuthModule {}
