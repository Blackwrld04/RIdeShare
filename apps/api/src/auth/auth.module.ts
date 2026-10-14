import type { AppConfig } from "@commuteshare/config";
import { Module, type Provider } from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { AccessTokenGuard } from "./access-token.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { createOtpDelivery, OtpDelivery } from "./otp-delivery.js";
import { TokenService } from "./token.service.js";

const otpDeliveryProvider: Provider<OtpDelivery> = {
  provide: OtpDelivery,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => createOtpDelivery(config),
};

@Module({
  controllers: [AuthController],
  providers: [otpDeliveryProvider, TokenService, AuthService, AccessTokenGuard],
  exports: [TokenService, AccessTokenGuard],
})
export class AuthModule {}
