import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { RedisService } from "./redis.service.js";

type DependencyStatus = "up" | "down";

export interface ReadinessReport {
  status: "ok" | "error";
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
}

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async check(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([
      this.inspect(() => this.database.ping()),
      this.inspect(() => this.redis.ping()),
    ]);

    return {
      status: database === "up" && redis === "up" ? "ok" : "error",
      checks: { database, redis },
    };
  }

  private async inspect(check: () => Promise<void>): Promise<DependencyStatus> {
    try {
      await check();
      return "up";
    } catch {
      return "down";
    }
  }
}
