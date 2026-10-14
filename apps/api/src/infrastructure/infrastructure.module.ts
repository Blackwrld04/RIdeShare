import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, appConfigProvider } from "../config.provider.js";
import { DatabaseService } from "./database.service.js";
import { ReadinessService } from "./readiness.service.js";
import { RedisService } from "./redis.service.js";

@Global()
@Module({
  providers: [
    appConfigProvider,
    DatabaseService,
    RedisService,
    ReadinessService,
  ],
  exports: [APP_CONFIG, DatabaseService, RedisService, ReadinessService],
})
export class InfrastructureModule {}
