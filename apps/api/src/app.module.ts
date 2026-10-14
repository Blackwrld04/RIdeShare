import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./health.controller.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";
import { ProfileModule } from "./profiles/profile.module.js";

@Module({
  imports: [InfrastructureModule, AuthModule, ProfileModule],
  controllers: [HealthController],
})
export class AppModule {}
