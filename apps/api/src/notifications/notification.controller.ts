import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/access-token.guard.js";
import { ZodValidationPipe } from "../shared/zod-validation.pipe.js";
import {
  type ListNotificationsInput,
  listNotificationsSchema,
  notificationIdSchema,
  type RegisterWebPushSubscriptionInput,
  registerWebPushSubscriptionSchema,
  webPushSubscriptionIdSchema,
} from "./notification.schemas.js";
import {
  type NotificationListResponse,
  type NotificationResponse,
  NotificationService,
  type WebPushConfigResponse,
  type WebPushSubscriptionResponse,
} from "./notification.service.js";

@Controller("notifications")
@UseGuards(AccessTokenGuard)
export class NotificationController {
  constructor(
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
  ) {}

  @Get("push/config")
  pushConfig(): WebPushConfigResponse {
    return this.notifications.getWebPushConfig();
  }

  @Post("push/subscriptions")
  registerWebPushSubscription(
    @Req() request: AuthenticatedRequest,
    @Headers("user-agent") userAgent: string | undefined,
    @Body(new ZodValidationPipe(registerWebPushSubscriptionSchema))
    input: RegisterWebPushSubscriptionInput,
  ): Promise<WebPushSubscriptionResponse> {
    return this.notifications.registerWebPushSubscription(
      request.auth.userId,
      input,
      userAgent,
    );
  }

  @Delete("push/subscriptions/:subscriptionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  disableWebPushSubscription(
    @Req() request: AuthenticatedRequest,
    @Param("subscriptionId", new ZodValidationPipe(webPushSubscriptionIdSchema))
    subscriptionId: string,
  ): Promise<void> {
    return this.notifications.disableWebPushSubscription(
      request.auth.userId,
      subscriptionId,
    );
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listNotificationsSchema))
    input: ListNotificationsInput,
  ): Promise<NotificationListResponse> {
    return this.notifications.list(request.auth.userId, input);
  }

  @Post("read-all")
  @HttpCode(200)
  markAllRead(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ updated: number }> {
    return this.notifications.markAllRead(request.auth.userId);
  }

  @Post(":notificationId/read")
  @HttpCode(200)
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param("notificationId", new ZodValidationPipe(notificationIdSchema))
    notificationId: string,
  ): Promise<NotificationResponse> {
    return this.notifications.markRead(request.auth.userId, notificationId);
  }
}
