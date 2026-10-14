import {
  type AppConfig,
  PAYOUT_QUEUE_NAME,
  PROCESS_PAYOUT_JOB,
  RECONCILE_PAYOUTS_JOB,
} from "@commuteshare/config";
import {
  BankAccountStatus,
  checkDatabase,
  createDatabase,
  type Database,
  PayoutStatus,
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
import {
  PaystackTransferClient,
  type TransferResult,
} from "./paystack-transfer.client.js";

interface PayoutJobData {
  payoutId?: string;
}

@Injectable()
export class WorkerRuntimeService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly database: Database;
  private readonly redis: Redis;
  private readonly paystack: PaystackTransferClient;
  private readonly config: AppConfig;
  private queue: Queue<PayoutJobData> | null = null;
  private worker: Worker<PayoutJobData> | null = null;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.config = config;
    this.database = createDatabase(config.DATABASE_URL);
    this.paystack = new PaystackTransferClient(config);
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
      this.queue = new Queue(PAYOUT_QUEUE_NAME, { connection: this.redis });
      this.worker = new Worker(
        PAYOUT_QUEUE_NAME,
        (job) => this.processJob(job),
        { connection: this.redis, concurrency: 5 },
      );
      this.worker.on("error", (error) => this.logger.error(error));
      await this.queue.upsertJobScheduler(
        "payout-reconciler",
        { every: this.config.PAYOUT_RECONCILIATION_SECONDS * 1_000 },
        {
          name: RECONCILE_PAYOUTS_JOB,
          data: {},
          opts: { removeOnComplete: 100, removeOnFail: 100 },
        },
      );
      await this.reconcilePayouts();
      this.logger.log("Worker dependencies ready");
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

  private async processJob(job: Job<PayoutJobData>): Promise<void> {
    if (job.name === RECONCILE_PAYOUTS_JOB) {
      await this.reconcilePayouts();
      return;
    }

    if (job.name === PROCESS_PAYOUT_JOB && job.data.payoutId) {
      await this.processPayout(job.data.payoutId);
    }
  }

  private async reconcilePayouts(): Promise<void> {
    if (!this.queue) {
      return;
    }

    await this.database.client.driverPayout.updateMany({
      where: {
        status: PayoutStatus.PROCESSING,
        attemptedAt: { lt: new Date(Date.now() - 15 * 60 * 1_000) },
      },
      data: {
        status: PayoutStatus.SCHEDULED,
        providerMessage: "Recovered stale payout attempt",
      },
    });

    const payouts = await this.database.client.driverPayout.findMany({
      where: {
        status: PayoutStatus.SCHEDULED,
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
      take: 200,
      select: { id: true },
    });

    for (const payout of payouts) {
      const jobId = `payout-${payout.id}`;
      const existing = await this.queue.getJob(jobId);

      if (existing) {
        const state = await existing.getState();

        if (state === "failed" || state === "completed") {
          await existing.remove();
        } else {
          continue;
        }
      }

      await this.queue.add(
        PROCESS_PAYOUT_JOB,
        { payoutId: payout.id },
        {
          jobId,
          attempts: 8,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: 1_000,
          removeOnFail: false,
        },
      );
    }
  }

  private async processPayout(payoutId: string): Promise<void> {
    const claimed = await this.database.client.driverPayout.updateMany({
      where: {
        id: payoutId,
        status: PayoutStatus.SCHEDULED,
        scheduledFor: { lte: new Date() },
      },
      data: {
        status: PayoutStatus.PROCESSING,
        attemptedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    if (claimed.count !== 1) {
      return;
    }

    const payout = await this.database.client.driverPayout.findUniqueOrThrow({
      where: { id: payoutId },
      include: { bankAccount: true },
    });

    if (payout.bankAccount.status !== BankAccountStatus.VERIFIED) {
      await this.database.client.driverPayout.updateMany({
        where: { id: payout.id, status: PayoutStatus.PROCESSING },
        data: {
          status: PayoutStatus.FAILED,
          providerMessage: "Driver bank account is not verified",
          failedAt: new Date(),
        },
      });
      return;
    }

    try {
      const result = await this.paystack.initiate({
        amountKobo: Number(payout.amountKobo),
        currency: payout.currency,
        recipientCode: payout.bankAccount.providerRecipientCode,
        reference: payout.reference,
        reason: "CommuteShare ride payout",
      });
      await this.recordTransferResult(payout.id, payout, result);
    } catch (initiationError) {
      try {
        const verified = await this.paystack.verify(payout.reference);
        await this.recordTransferResult(payout.id, payout, verified);
      } catch {
        await this.database.client.driverPayout.updateMany({
          where: { id: payout.id, status: PayoutStatus.PROCESSING },
          data: {
            status: PayoutStatus.SCHEDULED,
            providerMessage: this.errorMessage(initiationError),
          },
        });
        throw initiationError instanceof Error
          ? initiationError
          : new Error("Paystack transfer initiation failed");
      }
    }
  }

  private async recordTransferResult(
    payoutId: string,
    payout: { amountKobo: bigint; currency: string; reference: string },
    result: TransferResult,
  ): Promise<void> {
    if (
      BigInt(result.amountKobo) !== payout.amountKobo ||
      result.currency !== payout.currency ||
      result.reference !== payout.reference
    ) {
      throw new Error("Paystack transfer response did not match payout");
    }

    if (result.status === "otp") {
      await this.database.client.driverPayout.updateMany({
        where: { id: payoutId, status: PayoutStatus.PROCESSING },
        data: {
          status: PayoutStatus.FAILED,
          providerTransferCode: result.transferCode,
          providerMessage: "Paystack transfer OTP must be disabled",
          failedAt: new Date(),
        },
      });
      return;
    }

    const conclusiveStatus =
      result.status === "failed"
        ? PayoutStatus.FAILED
        : result.status === "reversed"
          ? PayoutStatus.REVERSED
          : PayoutStatus.SUBMITTED;
    const now = new Date();
    await this.database.client.driverPayout.updateMany({
      where: { id: payoutId, status: PayoutStatus.PROCESSING },
      data: {
        status: conclusiveStatus,
        providerTransferCode: result.transferCode,
        providerMessage: result.message.slice(0, 280),
        ...(conclusiveStatus === PayoutStatus.SUBMITTED
          ? { submittedAt: now }
          : { failedAt: now }),
      },
    });
  }

  private errorMessage(error: unknown): string {
    return (
      error instanceof Error ? error.message : "Unknown provider error"
    ).slice(0, 280);
  }
}
