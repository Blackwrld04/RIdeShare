import type { AppConfig } from "@commuteshare/config";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { NotificationService } from "./notification.service.js";

const config = {
  WEB_PUSH_PROVIDER: "vapid",
  WEB_PUSH_VAPID_PUBLIC_KEY: "public-key",
} as AppConfig;

describe("NotificationService web push subscriptions", () => {
  it("registers and reassigns a browser endpoint", async () => {
    const now = new Date("2026-10-15T03:00:00.000Z");
    const upsert = vi.fn().mockResolvedValue({
      id: "0c2b7e66-1284-44c5-abd2-c09cb59a8d9d",
      enabled: true,
      expirationAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const service = new NotificationService(config, {
      client: { webPushSubscription: { upsert } },
    } as unknown as DatabaseService);

    const response = await service.registerWebPushSubscription(
      "user-id",
      {
        endpoint: "https://push.example/subscription",
        expirationTime: null,
        keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
      },
      "browser-agent",
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpointHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
        update: expect.objectContaining({
          userId: "user-id",
          enabled: true,
          disabledAt: null,
        }),
      }),
    );
    expect(response).toMatchObject({
      id: "0c2b7e66-1284-44c5-abd2-c09cb59a8d9d",
      enabled: true,
    });
  });

  it("rejects expired subscriptions", async () => {
    const service = new NotificationService(config, {
      client: { webPushSubscription: { upsert: vi.fn() } },
    } as unknown as DatabaseService);

    await expect(
      service.registerWebPushSubscription("user-id", {
        endpoint: "https://push.example/subscription",
        expirationTime: Date.now() - 1_000,
        keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not disable another user's subscription", async () => {
    const service = new NotificationService(config, {
      client: {
        webPushSubscription: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    } as unknown as DatabaseService);

    await expect(
      service.disableWebPushSubscription(
        "user-id",
        "0c2b7e66-1284-44c5-abd2-c09cb59a8d9d",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
