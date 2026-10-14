import {
  Controller,
  Get,
  HttpCode,
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
} from "./notification.schemas.js";
import {
  type NotificationListResponse,
  type NotificationResponse,
  NotificationService,
} from "./notification.service.js";

@Controller("notifications")
@UseGuards(AccessTokenGuard)
export class NotificationController {
  constructor(
    @Inject(NotificationService)
    private readonly notifications: NotificationService,
  ) {}

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
