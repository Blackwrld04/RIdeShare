import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./health.controller.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";

@Module({
  imports: [InfrastructureModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
