import type { AppConfig } from "@commuteshare/config";
import { type Database, PushDeliveryStatus } from "@commuteshare/database";
import type { WebPushClient } from "./web-push.client.js";
import {
  classifyWebPushFailure,
  nextWebPushAttemptAt,
} from "./web-push.policy.js";

export class WebPushDispatcher {
  constructor(
    private readonly config: AppConfig,
    private readonly database: Database,
    private readonly client: WebPushClient,
  ) {}

  async runBatch(): Promise<void> {
    const now = new Date();
    await this.recoverStaleDeliveries(now);
    await this.failUnavailableDeliveries(now);
    await this.prepareNotifications(now);
    const deliveries = await this.database.client.webPushDelivery.findMany({
      where: {
        status: PushDeliveryStatus.PENDING,
        nextAttemptAt: { lte: now },
        subscription: {
          is: {
            enabled: true,
            OR: [{ expirationAt: null }, { expirationAt: { gt: now } }],
          },
        },
      },
      orderBy: { nextAttemptAt: "asc" },
      take: 100,
      select: { id: true },
    });
    for (const delivery of deliveries) {
      await this.processDelivery(delivery.id, now);
    }
  }

  private async failUnavailableDeliveries(now: Date): Promise<void> {
    await this.database.client.webPushDelivery.updateMany({
      where: {
        status: PushDeliveryStatus.PENDING,
        OR: [
          { subscription: { is: { enabled: false } } },
          { subscription: { is: { expirationAt: { lte: now } } } },
        ],
      },
      data: {
        status: PushDeliveryStatus.FAILED,
        failedAt: now,
        lastError: "Push subscription is unavailable",
      },
    });
  }

  private async recoverStaleDeliveries(now: Date): Promise<void> {
    await this.database.client.webPushDelivery.updateMany({
      where: {
        status: PushDeliveryStatus.PROCESSING,
        attemptedAt: { lt: new Date(now.getTime() - 2 * 60 * 1_000) },
      },
      data: {
        status: PushDeliveryStatus.PENDING,
        nextAttemptAt: now,
        lastError: "Recovered stale delivery attempt",
      },
    });
  }

  private async prepareNotifications(now: Date): Promise<void> {
    const notifications = await this.database.client.userNotification.findMany({
      where: { pushPreparedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, userId: true },
    });

    for (const notification of notifications) {
      await this.database.client.$transaction(async (transaction) => {
        const claimed = await transaction.userNotification.updateMany({
          where: { id: notification.id, pushPreparedAt: null },
          data: { pushPreparedAt: now },
        });
        if (claimed.count !== 1) {
          return;
        }
        const subscriptions = await transaction.webPushSubscription.findMany({
          where: {
            userId: notification.userId,
            enabled: true,
            OR: [{ expirationAt: null }, { expirationAt: { gt: now } }],
          },
          select: { id: true },
        });
        if (subscriptions.length > 0) {
          await transaction.webPushDelivery.createMany({
            data: subscriptions.map((subscription) => ({
              notificationId: notification.id,
              subscriptionId: subscription.id,
              nextAttemptAt: now,
            })),
            skipDuplicates: true,
          });
        }
      });
    }
  }

  private async processDelivery(deliveryId: string, now: Date): Promise<void> {
    const claimed = await this.database.client.webPushDelivery.updateMany({
      where: {
        id: deliveryId,
        status: PushDeliveryStatus.PENDING,
        nextAttemptAt: { lte: now },
        subscription: {
          is: {
            enabled: true,
            OR: [{ expirationAt: null }, { expirationAt: { gt: now } }],
          },
        },
      },
      data: {
        status: PushDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        attemptedAt: now,
      },
    });
    if (claimed.count !== 1) {
      return;
    }

    const delivery =
      await this.database.client.webPushDelivery.findUniqueOrThrow({
        where: { id: deliveryId },
        include: { notification: true, subscription: true },
      });

    try {
      await this.client.send(
        {
          endpoint: delivery.subscription.endpoint,
          expirationAt: delivery.subscription.expirationAt,
          p256dh: delivery.subscription.p256dh,
          auth: delivery.subscription.auth,
        },
        {
          notificationId: delivery.notification.id,
          kind: delivery.notification.kind,
          title: delivery.notification.title,
          body: delivery.notification.body,
          data: delivery.notification.data,
          createdAt: delivery.notification.createdAt.toISOString(),
        },
      );
      await this.database.client.webPushDelivery.update({
        where: { id: delivery.id },
        data: {
          status: PushDeliveryStatus.SENT,
          sentAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      await this.recordFailure(delivery, error);
    }
  }

  private async recordFailure(
    delivery: {
      id: string;
      subscriptionId: string;
      attemptCount: number;
    },
    error: unknown,
  ): Promise<void> {
    const failure = classifyWebPushFailure(error);
    const exhausted =
      delivery.attemptCount >= this.config.WEB_PUSH_MAX_ATTEMPTS;
    const terminal = failure.kind !== "retryable" || exhausted;
    const now = new Date();

    await this.database.client.$transaction(async (transaction) => {
      await transaction.webPushDelivery.update({
        where: { id: delivery.id },
        data: terminal
          ? {
              status: PushDeliveryStatus.FAILED,
              failedAt: now,
              lastError: failure.message,
            }
          : {
              status: PushDeliveryStatus.PENDING,
              nextAttemptAt: nextWebPushAttemptAt(now, delivery.attemptCount),
              lastError: failure.message,
            },
      });
      if (failure.kind === "expired") {
        await transaction.webPushSubscription.update({
          where: { id: delivery.subscriptionId },
          data: { enabled: false, disabledAt: now },
        });
      }
    });
  }
}
