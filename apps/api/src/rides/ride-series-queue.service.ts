import {
  type AppConfig,
  MATERIALIZE_RIDE_SERIES_JOB,
  RIDE_SCHEDULING_QUEUE_NAME,
} from "@commuteshare/config";
import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { APP_CONFIG } from "../config.provider.js";

interface RideSchedulingJobData {
  seriesId: string;
}

@Injectable()
export class RideSeriesQueueService implements OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly queue: Queue<RideSchedulingJobData>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.redis = new Redis(config.REDIS_URL, {
      connectTimeout: 2_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.redis.on("error", () => undefined);
    this.queue = new Queue(RIDE_SCHEDULING_QUEUE_NAME, {
      connection: this.redis,
    });
  }

  async enqueue(seriesId: string): Promise<void> {
    await this.queue.add(
      MATERIALIZE_RIDE_SERIES_JOB,
      { seriesId },
      {
        jobId: `ride-series-${seriesId}-${Date.now()}`,
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
    this.redis.disconnect();
  }
}
