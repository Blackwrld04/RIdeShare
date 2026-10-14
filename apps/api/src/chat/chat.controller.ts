import {
  Body,
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
  chatBookingIdSchema,
  type ListChatMessagesInput,
  listChatMessagesSchema,
  type MarkChatReadInput,
  markChatReadSchema,
  type SendChatMessageInput,
  sendChatMessageSchema,
} from "./chat.schemas.js";
import {
  type ChatConversationResponse,
  type ChatMessagePageResponse,
  type ChatMessageResponse,
  type ChatReadResponse,
  ChatService,
} from "./chat.service.js";

@Controller("chat")
@UseGuards(AccessTokenGuard)
export class ChatController {
  constructor(@Inject(ChatService) private readonly chat: ChatService) {}

  @Get("conversations")
  listConversations(
    @Req() request: AuthenticatedRequest,
  ): Promise<ChatConversationResponse[]> {
    return this.chat.listConversations(request.auth.userId);
  }

  @Get("bookings/:bookingId/messages")
  listMessages(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(chatBookingIdSchema))
    bookingId: string,
    @Query(new ZodValidationPipe(listChatMessagesSchema))
    input: ListChatMessagesInput,
  ): Promise<ChatMessagePageResponse> {
    return this.chat.listMessages(request.auth.userId, bookingId, input);
  }

  @Post("bookings/:bookingId/messages")
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(chatBookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(sendChatMessageSchema))
    input: SendChatMessageInput,
  ): Promise<ChatMessageResponse> {
    return this.chat.sendMessage(request.auth.userId, bookingId, input);
  }

  @Post("bookings/:bookingId/read")
  @HttpCode(200)
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param("bookingId", new ZodValidationPipe(chatBookingIdSchema))
    bookingId: string,
    @Body(new ZodValidationPipe(markChatReadSchema))
    input: MarkChatReadInput,
  ): Promise<ChatReadResponse> {
    return this.chat.markRead(request.auth.userId, bookingId, input);
  }
}
