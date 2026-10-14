import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import type { ListNotificationsInput } from "./notification.schemas.js";

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

@Injectable()
export class NotificationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

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
}
