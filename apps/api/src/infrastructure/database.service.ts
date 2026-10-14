import type { AppConfig } from "@commuteshare/config";
import {
  checkDatabase,
  createDatabase,
  type Database,
  type PrismaClient,
} from "@commuteshare/database";
import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly database: Database;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.database = createDatabase(config.DATABASE_URL);
  }

  async ping(): Promise<void> {
    await checkDatabase(this.database);
  }

  get client(): PrismaClient {
    return this.database.client;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.database.close();
  }
}
