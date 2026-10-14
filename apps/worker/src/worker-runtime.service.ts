import type { AppConfig } from "@commuteshare/config";
import {
  checkDatabase,
  createDatabase,
  type Database,
} from "@commuteshare/database";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Redis } from "ioredis";
import { APP_CONFIG } from "./config.provider.js";

@Injectable()
export class WorkerRuntimeService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly database: Database;
  private readonly redis: Redis;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.database = createDatabase(config.DATABASE_URL);
    this.redis = new Redis(config.REDIS_URL, {
      connectTimeout: 5_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.redis.on("error", () => undefined);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      await Promise.all([checkDatabase(this.database), this.redis.ping()]);
      this.logger.log("Worker dependencies ready");
    } catch (error) {
      this.redis.disconnect();
      await this.database.close();
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.redis.disconnect();
    await this.database.close();
  }
}
