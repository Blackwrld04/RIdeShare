import {
  type AppConfig,
  DISPATCH_WEB_PUSH_JOB,
  WEB_PUSH_QUEUE_NAME,
} from "@commuteshare/config";
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
import { type Job, Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { APP_CONFIG } from "./config.provider.js";
import { WebPushClient } from "./web-push.client.js";
import { WebPushDispatcher } from "./web-push.dispatcher.js";

type WebPushJobData = Record<string, never>;

@Injectable()
export class WebPushRuntimeService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(WebPushRuntimeService.name);
  private readonly database: Database;
  private readonly redis: Redis;
  private readonly dispatcher: WebPushDispatcher;
  private queue: Queue<WebPushJobData> | null = null;
  private worker: Worker<WebPushJobData> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.database = createDatabase(config.DATABASE_URL);
    this.redis = new Redis(config.REDIS_URL, {
      connectTimeout: 5_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.redis.on("error", () => undefined);
    this.dispatcher = new WebPushDispatcher(
      config,
      this.database,
      new WebPushClient(config),
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      await Promise.all([checkDatabase(this.database), this.redis.ping()]);
      this.queue = new Queue(WEB_PUSH_QUEUE_NAME, { connection: this.redis });
      this.worker = new Worker(
        WEB_PUSH_QUEUE_NAME,
        (job) => this.processJob(job),
        { connection: this.redis, concurrency: 1 },
      );
      this.worker.on("error", (error) => this.logger.error(error));
      await this.queue.upsertJobScheduler(
        "web-push-dispatcher",
        { every: this.config.WEB_PUSH_SCAN_SECONDS * 1_000 },
        {
          name: DISPATCH_WEB_PUSH_JOB,
          data: {},
          opts: { removeOnComplete: 100, removeOnFail: 100 },
        },
      );
      await this.dispatcher.runBatch();
      this.logger.log("Web push worker ready");
    } catch (error) {
      await this.worker?.close();
      await this.queue?.close();
      this.redis.disconnect();
      await this.database.close();
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    this.redis.disconnect();
    await this.database.close();
  }

  private async processJob(job: Job<WebPushJobData>): Promise<void> {
    if (job.name === DISPATCH_WEB_PUSH_JOB) {
      await this.dispatcher.runBatch();
    }
  }
}
