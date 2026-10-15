import { createHash } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import type {
  ListNotificationsInput,
  RegisterWebPushSubscriptionInput,
} from "./notification.schemas.js";

export interface NotificationResponse {
  id: string;
  kind: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  unreadCount: number;
}

export interface WebPushConfigResponse {
  enabled: boolean;
  publicKey: string | null;
}

export interface WebPushSubscriptionResponse {
  id: string;
  enabled: boolean;
  expirationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  getWebPushConfig(): WebPushConfigResponse {
    const enabled =
      this.config.WEB_PUSH_PROVIDER === "vapid" &&
      Boolean(this.config.WEB_PUSH_VAPID_PUBLIC_KEY);
    return {
      enabled,
      publicKey: enabled
        ? (this.config.WEB_PUSH_VAPID_PUBLIC_KEY ?? null)
        : null,
    };
  }

  async registerWebPushSubscription(
    userId: string,
    input: RegisterWebPushSubscriptionInput,
    userAgent?: string,
  ): Promise<WebPushSubscriptionResponse> {
    const expirationAt =
      input.expirationTime === null || input.expirationTime === undefined
        ? null
        : new Date(input.expirationTime);
    if (expirationAt && expirationAt <= new Date()) {
      throw new BadRequestException("Push subscription is expired");
    }
    const endpointHash = createHash("sha256")
      .update(input.endpoint)
      .digest("hex");
    const now = new Date();
    const normalizedUserAgent = userAgent?.slice(0, 512) ?? null;
    const subscription = await this.database.client.webPushSubscription.upsert({
      where: { endpointHash },
      create: {
        userId,
        endpoint: input.endpoint,
        endpointHash,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        expirationAt,
        userAgent: normalizedUserAgent,
        lastSeenAt: now,
      },
      update: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        expirationAt,
        userAgent: normalizedUserAgent,
        enabled: true,
        disabledAt: null,
        lastSeenAt: now,
      },
    });
    return this.toWebPushSubscriptionResponse(subscription);
  }

  async disableWebPushSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<void> {
    const subscription =
      await this.database.client.webPushSubscription.findFirst({
        where: { id: subscriptionId, userId },
        select: { id: true, enabled: true },
      });
    if (!subscription) {
      throw new NotFoundException("Push subscription not found");
    }
    if (subscription.enabled) {
      await this.database.client.webPushSubscription.update({
        where: { id: subscription.id },
        data: { enabled: false, disabledAt: new Date() },
      });
    }
  }

  async list(
    userId: string,
    input: ListNotificationsInput,
  ): Promise<NotificationListResponse> {
    const [items, unreadCount] = await Promise.all([
      this.database.client.userNotification.findMany({
        where: {
          userId,
          ...(input.unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      }),
      this.database.client.userNotification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      unreadCount,
    };
  }

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.database.client.userNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    const updated = await this.database.client.userNotification.update({
      where: { id: notification.id },
      data: notification.readAt ? {} : { readAt: new Date() },
    });
    return this.toResponse(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.database.client.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private toResponse(notification: {
    id: string;
    kind: string;
    title: string;
    body: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationResponse {
    return {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private toWebPushSubscriptionResponse(subscription: {
    id: string;
    enabled: boolean;
    expirationAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): WebPushSubscriptionResponse {
    return {
      id: subscription.id,
      enabled: subscription.enabled,
      expirationAt: subscription.expirationAt?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}
