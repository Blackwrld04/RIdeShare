import type { AppConfig } from "@commuteshare/config";
import * as webPush from "web-push";
import { webPushUrgency } from "./web-push.policy.js";

export interface WebPushMessage {
  notificationId: string;
  kind: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: string;
}

export interface WebPushTarget {
  endpoint: string;
  expirationAt: Date | null;
  p256dh: string;
  auth: string;
}

type WebPushTransport = Pick<typeof webPush, "sendNotification">;

export class WebPushClient {
  constructor(
    private readonly config: AppConfig,
    private readonly transport: WebPushTransport = webPush,
  ) {}

  async send(target: WebPushTarget, message: WebPushMessage): Promise<void> {
    if (this.config.WEB_PUSH_PROVIDER === "console") {
      return;
    }

    await this.transport.sendNotification(
      {
        endpoint: target.endpoint,
        expirationTime: target.expirationAt?.getTime() ?? null,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(message),
      {
        TTL: this.config.WEB_PUSH_TTL_SECONDS,
        timeout: 10_000,
        urgency: webPushUrgency(message.kind),
        vapidDetails: {
          subject: this.config.WEB_PUSH_VAPID_SUBJECT ?? "",
          publicKey: this.config.WEB_PUSH_VAPID_PUBLIC_KEY ?? "",
          privateKey: this.config.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
        },
      },
    );
  }
}
