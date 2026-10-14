import {
  type AppConfig,
  PAYOUT_QUEUE_NAME,
  PROCESS_PAYOUT_JOB,
} from "@commuteshare/config";
import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { APP_CONFIG } from "../config.provider.js";

interface PayoutJobData {
  payoutId: string;
}

@Injectable()
export class PayoutQueueService implements OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly queue: Queue<PayoutJobData>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.redis = new Redis(config.REDIS_URL, {
      connectTimeout: 2_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.redis.on("error", () => undefined);
    this.queue = new Queue(PAYOUT_QUEUE_NAME, { connection: this.redis });
  }

  async enqueue(payoutId: string, scheduledFor: Date): Promise<void> {
    await this.queue.add(
      PROCESS_PAYOUT_JOB,
      { payoutId },
      {
        jobId: `payout-${payoutId}`,
        delay: Math.max(0, scheduledFor.getTime() - Date.now()),
        attempts: 8,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 1_000,
        removeOnFail: false,
      },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
    this.redis.disconnect();
  }
}
