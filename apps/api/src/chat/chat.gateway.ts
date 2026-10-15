import { UserStatus } from "@commuteshare/database";
import { Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { TokenService } from "../auth/token.service.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  chatBookingIdSchema,
  markChatReadSchema,
  sendChatMessageSchema,
} from "./chat.schemas.js";
import { ChatService } from "./chat.service.js";

interface JoinChatInput {
  bookingId: string;
}

interface SendRealtimeMessageInput {
  bookingId: string;
  clientMessageId: string;
  body: string;
}

interface ReadRealtimeMessageInput {
  bookingId: string;
  messageId: string;
}

interface TypingInput {
  bookingId: string;
  isTyping: boolean;
}

@WebSocketGateway({ namespace: "chat" })
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  private readonly server!: Namespace;

  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ChatService) private readonly chat: ChatService,
  ) {}

  afterInit(server: Namespace): void {
    server.use(async (client, next) => {
      try {
        const token = this.accessToken(client);
        const identity = await this.tokens.verifyAccessToken(token);
        const session = await this.database.client.authSession.findFirst({
          where: {
            id: identity.sessionId,
            userId: identity.userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            user: { status: UserStatus.ACTIVE },
          },
          select: { id: true },
        });
        if (!session) {
          throw new Error("Session is no longer active");
        }
        client.data.auth = identity;
        next();
      } catch {
        next(new Error("A valid active session is required"));
      }
    });
  }

  @SubscribeMessage("chat:join")
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: JoinChatInput,
  ) {
    const userId = this.userId(client);
    const bookingId = this.parseBookingId(input?.bookingId);
    await this.run(() => this.chat.authorizeRealtime(userId, bookingId, false));
    await client.join(this.room(bookingId));
    return { bookingId };
  }

  @SubscribeMessage("chat:leave")
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: JoinChatInput,
  ) {
    this.userId(client);
    const bookingId = this.parseBookingId(input?.bookingId);
    await client.leave(this.room(bookingId));
    return { bookingId };
  }

  @SubscribeMessage("chat:send")
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: SendRealtimeMessageInput,
  ) {
    const userId = this.userId(client);
    const bookingId = this.parseBookingId(input?.bookingId);
    this.assertJoined(client, bookingId);
    const parsed = sendChatMessageSchema.safeParse({
      clientMessageId: input?.clientMessageId,
      body: input?.body,
    });
    if (!parsed.success) {
      throw new WsException("Invalid chat message");
    }
    await this.run(() => this.chat.authorizeRealtime(userId, bookingId, true));
    const message = await this.run(() =>
      this.chat.sendMessage(userId, bookingId, {
        clientMessageId: parsed.data.clientMessageId,
        body: parsed.data.body,
      }),
    );
    this.server.to(this.room(bookingId)).emit("chat:message", message);
    return message;
  }

  @SubscribeMessage("chat:read")
  async read(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: ReadRealtimeMessageInput,
  ) {
    const userId = this.userId(client);
    const bookingId = this.parseBookingId(input?.bookingId);
    this.assertJoined(client, bookingId);
    const parsed = markChatReadSchema.safeParse({
      messageId: input?.messageId,
    });
    if (!parsed.success) {
      throw new WsException("Invalid read receipt");
    }
    const receipt = await this.run(() =>
      this.chat.markRead(userId, bookingId, {
        messageId: parsed.data.messageId,
      }),
    );
    this.server.to(this.room(bookingId)).emit("chat:read", {
      ...receipt,
      userId,
    });
    return receipt;
  }

  @SubscribeMessage("chat:typing")
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() input: TypingInput,
  ) {
    const userId = this.userId(client);
    const bookingId = this.parseBookingId(input?.bookingId);
    this.assertJoined(client, bookingId);
    if (typeof input?.isTyping !== "boolean") {
      throw new WsException("Invalid typing state");
    }
    await this.run(() => this.chat.authorizeRealtime(userId, bookingId, true));
    client.to(this.room(bookingId)).emit("chat:typing", {
      bookingId,
      userId,
      isTyping: input.isTyping,
    });
    return { bookingId };
  }

  private accessToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.length > 0) {
      return authToken;
    }
    const authorization = client.handshake.headers.authorization;
    const [scheme, token] = authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      throw new Error("Access token required");
    }
    return token;
  }

  private userId(client: Socket): string {
    const userId = client.data.auth?.userId;
    if (typeof userId !== "string") {
      throw new WsException("A valid active session is required");
    }
    return userId;
  }

  private parseBookingId(value: unknown): string {
    const parsed = chatBookingIdSchema.safeParse(value);
    if (!parsed.success) {
      throw new WsException("Invalid booking identifier");
    }
    return parsed.data;
  }

  private room(bookingId: string): string {
    return `booking:${bookingId}`;
  }

  private assertJoined(client: Socket, bookingId: string): void {
    if (!client.rooms.has(this.room(bookingId))) {
      throw new WsException("Join the conversation before sending events");
    }
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw new WsException(this.errorMessage(error));
    }
  }

  private errorMessage(error: unknown): string {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message.slice(0, 280);
    }
    return "Chat request failed";
  }
}
