import type { AppConfig } from "@commuteshare/config";
import { Module, type Provider } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { APP_CONFIG } from "../config.provider.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { HttpNinjaNinProvider, NinProvider } from "./nin-provider.js";

const ninProvider: Provider<NinProvider> = {
  provide: NinProvider,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig) => new HttpNinjaNinProvider(config),
};

@Module({
  imports: [AuthModule],
  controllers: [IdentityController],
  providers: [ninProvider, IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
