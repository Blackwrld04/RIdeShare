import { createHash, randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import {
  createDatabase,
  type Database,
  PushDeliveryStatus,
} from "@commuteshare/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebPushClient } from "./web-push.client.js";
import { WebPushDispatcher } from "./web-push.dispatcher.js";

const describeIntegration = process.env.WEB_PUSH_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("web push dispatcher integration", () => {
  let database: Database;
  let dispatcher: WebPushDispatcher;
  let userId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.WEB_PUSH_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("WEB_PUSH_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    const config = {
      WEB_PUSH_PROVIDER: "console",
      WEB_PUSH_MAX_ATTEMPTS: 5,
    } as AppConfig;
    dispatcher = new WebPushDispatcher(
      config,
      database,
      new WebPushClient(config),
    );
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const user = await database.client.user.create({
      data: {
        phoneE164: `+234809${suffix}`,
        phoneVerifiedAt: new Date(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await database.client.user.delete({ where: { id: userId } });
    await database.close();
  });

  it("fans out each notification once and records successful delivery", async () => {
    const endpoint = `https://push.example/${randomUUID()}`;
    const subscription = await database.client.webPushSubscription.create({
      data: {
        userId,
        endpoint,
        endpointHash: createHash("sha256").update(endpoint).digest("hex"),
        p256dh: "a".repeat(87),
        auth: "b".repeat(22),
      },
    });
    const notification = await database.client.userNotification.create({
      data: {
        userId,
        kind: "chat_message",
        title: "New message",
        body: "Your driver sent a message",
        idempotencyKey: `web-push-${randomUUID()}`,
      },
    });

    await dispatcher.runBatch();
    await dispatcher.runBatch();

    const deliveries = await database.client.webPushDelivery.findMany({
      where: { notificationId: notification.id },
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      subscriptionId: subscription.id,
      status: PushDeliveryStatus.SENT,
      attemptCount: 1,
    });
    await expect(
      database.client.userNotification.findUniqueOrThrow({
        where: { id: notification.id },
        select: { pushPreparedAt: true },
      }),
    ).resolves.toMatchObject({ pushPreparedAt: expect.any(Date) });
  });

  it("fails queued deliveries when their subscription is unavailable", async () => {
    const endpoint = `https://push.example/${randomUUID()}`;
    const subscription = await database.client.webPushSubscription.create({
      data: {
        userId,
        endpoint,
        endpointHash: createHash("sha256").update(endpoint).digest("hex"),
        p256dh: "c".repeat(87),
        auth: "d".repeat(22),
        enabled: false,
        disabledAt: new Date(),
      },
    });
    const notification = await database.client.userNotification.create({
      data: {
        userId,
        kind: "ride_cancelled",
        title: "Ride cancelled",
        body: "Your scheduled ride was cancelled",
        idempotencyKey: `web-push-${randomUUID()}`,
        pushPreparedAt: new Date(),
      },
    });
    const delivery = await database.client.webPushDelivery.create({
      data: {
        notificationId: notification.id,
        subscriptionId: subscription.id,
      },
    });

    await dispatcher.runBatch();

    await expect(
      database.client.webPushDelivery.findUniqueOrThrow({
        where: { id: delivery.id },
      }),
    ).resolves.toMatchObject({
      status: PushDeliveryStatus.FAILED,
      attemptCount: 0,
      lastError: "Push subscription is unavailable",
      failedAt: expect.any(Date),
    });
  });
});
