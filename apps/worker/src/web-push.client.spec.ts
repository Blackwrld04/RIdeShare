import type { AppConfig } from "@commuteshare/config";
import { describe, expect, it, vi } from "vitest";
import { WebPushClient } from "./web-push.client.js";

const target = {
  endpoint: "https://push.example/subscription",
  expirationAt: null,
  p256dh: "a".repeat(87),
  auth: "b".repeat(22),
};

const message = {
  notificationId: "notification-id",
  kind: "safety_sos",
  title: "SOS alert",
  body: "A rider needs help",
  data: { rideId: "ride-id" },
  createdAt: "2026-10-15T03:00:00.000Z",
};

describe("WebPushClient", () => {
  it("sends encrypted payloads with VAPID details", async () => {
    const sendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });
    const client = new WebPushClient(
      {
        WEB_PUSH_PROVIDER: "vapid",
        WEB_PUSH_TTL_SECONDS: 3_600,
        WEB_PUSH_VAPID_SUBJECT: "mailto:ops@example.com",
        WEB_PUSH_VAPID_PUBLIC_KEY: "p".repeat(87),
        WEB_PUSH_VAPID_PRIVATE_KEY: "s".repeat(43),
      } as AppConfig,
      { sendNotification },
    );

    await client.send(target, message);

    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: target.endpoint }),
      JSON.stringify(message),
      expect.objectContaining({
        TTL: 3_600,
        urgency: "high",
        vapidDetails: expect.objectContaining({
          subject: "mailto:ops@example.com",
        }),
      }),
    );
  });

  it("does not contact a push service in console mode", async () => {
    const sendNotification = vi.fn();
    const client = new WebPushClient(
      { WEB_PUSH_PROVIDER: "console" } as AppConfig,
      { sendNotification },
    );

    await client.send(target, message);

    expect(sendNotification).not.toHaveBeenCalled();
  });
});
