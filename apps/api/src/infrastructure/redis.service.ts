import type { AppConfig } from "@commuteshare/config";
import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Redis } from "ioredis";
import { APP_CONFIG } from "../config.provider.js";

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = new Redis(config.REDIS_URL, {
      connectTimeout: 2_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.client.on("error", () => undefined);
  }

  async ping(): Promise<void> {
    if (this.client.status === "wait" || this.client.status === "end") {
      await this.client.connect();
    }

    await this.client.ping();
  }

  get connection(): Redis {
    return this.client;
  }

  onApplicationShutdown(): void {
    this.client.disconnect();
  }
}
