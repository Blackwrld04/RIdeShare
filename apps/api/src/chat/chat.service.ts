import { Prisma } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  CHAT_READABLE_BOOKING_STATUSES,
  canReadChat,
  canSendChatMessage,
  maskOffPlatformPaymentPhrases,
} from "./chat.policy.js";
import type {
  ListChatMessagesInput,
  MarkChatReadInput,
  SendChatMessageInput,
} from "./chat.schemas.js";

const chatMessageSelect = {
  id: true,
  bookingId: true,
  senderUserId: true,
  clientMessageId: true,
  kind: true,
  body: true,
  metadata: true,
  createdAt: true,
  sender: {
    select: { profile: { select: { displayName: true } } },
  },
} satisfies Prisma.ChatMessageSelect;

const chatBookingSelect = {
  id: true,
  status: true,
  passengerUserId: true,
  passenger: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
  rideOffer: {
    select: {
      id: true,
      status: true,
      departureAt: true,
      driverApplication: {
        select: {
          userId: true,
          user: {
            select: { id: true, profile: { select: { displayName: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.RideBookingSelect;

type ChatMessageRecord = Prisma.ChatMessageGetPayload<{
  select: typeof chatMessageSelect;
}>;

type ChatBookingRecord = Prisma.RideBookingGetPayload<{
  select: typeof chatBookingSelect;
}>;

interface UnreadCountRow {
  bookingId: string;
  count: number;
}

export interface ChatMessageResponse {
  id: string;
  bookingId: string;
  sender: {
    userId: string;
    displayName: string | null;
  };
  clientMessageId: string;
  kind: string;
  body: string;
  metadata: unknown;
  createdAt: string;
}

export interface ChatMessagePageResponse {
  items: ChatMessageResponse[];
  nextCursor: string | null;
  unreadCount: number;
  readThroughAt: string | null;
}

export interface ChatConversationResponse {
  bookingId: string;
  bookingStatus: string;
  ride: {
    id: string;
    status: string;
    departureAt: string;
  };
  participant: {
    userId: string;
    displayName: string | null;
    role: "driver" | "passenger";
  };
  latestMessage: ChatMessageResponse | null;
  unreadCount: number;
  readThroughAt: string | null;
}

export interface ChatReadResponse {
  bookingId: string;
  lastReadMessageId: string;
  readThroughAt: string;
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async listConversations(userId: string): Promise<ChatConversationResponse[]> {
    const conversations = await this.database.client.rideBooking.findMany({
      where: {
        status: { in: [...CHAT_READABLE_BOOKING_STATUSES] },
        OR: [
          { passengerUserId: userId },
          { rideOffer: { driverApplication: { userId } } },
        ],
      },
      select: {
        ...chatBookingSelect,
        chatMessages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: chatMessageSelect,
        },
      },
      orderBy: { rideOffer: { departureAt: "desc" } },
      take: 50,
    });
    const bookingIds = conversations.map((conversation) => conversation.id);
    const receipts =
      bookingIds.length === 0
        ? []
        : await this.database.client.chatReadReceipt.findMany({
            where: { userId, bookingId: { in: bookingIds } },
          });
    const receiptByBooking = new Map(
      receipts.map((receipt) => [receipt.bookingId, receipt]),
    );
    const unreadByBooking = await this.unreadCounts(userId, bookingIds);

    return conversations.map((conversation) => {
      const receipt = receiptByBooking.get(conversation.id);
      return {
        ...this.conversationDetails(userId, conversation),
        latestMessage: conversation.chatMessages[0]
          ? this.toMessage(conversation.chatMessages[0])
          : null,
        unreadCount: unreadByBooking.get(conversation.id) ?? 0,
        readThroughAt: receipt?.readThroughAt.toISOString() ?? null,
      };
    });
  }

  async listMessages(
    userId: string,
    bookingId: string,
    input: ListChatMessagesInput,
  ): Promise<ChatMessagePageResponse> {
    await this.requireParticipant(userId, bookingId);
    const cursor = input.cursor
      ? await this.database.client.chatMessage.findFirst({
          where: { id: input.cursor, bookingId },
          select: { id: true, createdAt: true },
        })
      : null;

    if (input.cursor && !cursor) {
      throw new BadRequestException("Chat cursor is invalid");
    }

    const messages = await this.database.client.chatMessage.findMany({
      where: {
        bookingId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: chatMessageSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
    });
    const hasMore = messages.length > input.limit;
    const page = hasMore ? messages.slice(0, input.limit) : messages;
    const [receipt, unreadCount] = await Promise.all([
      this.database.client.chatReadReceipt.findUnique({
        where: { bookingId_userId: { bookingId, userId } },
      }),
      this.unreadCount(userId, bookingId),
    ]);

    return {
      items: page.map((message) => this.toMessage(message)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
      unreadCount,
      readThroughAt: receipt?.readThroughAt.toISOString() ?? null,
    };
  }

  async sendMessage(
    userId: string,
    bookingId: string,
    input: SendChatMessageInput,
  ): Promise<ChatMessageResponse> {
    const booking = await this.requireParticipant(userId, bookingId);
    if (!canSendChatMessage(booking.status, booking.rideOffer.status)) {
      throw new ConflictException("This conversation is read only");
    }
    const body = maskOffPlatformPaymentPhrases(input.body);
    const duplicate = await this.findClientMessage(
      userId,
      input.clientMessageId,
    );
    if (duplicate) {
      return this.resolveDuplicate(duplicate, bookingId);
    }
    try {
      const message = await this.database.client.$transaction(
        async (transaction) => {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM ride_bookings WHERE id = ${bookingId}::uuid FOR UPDATE`,
          );
          const current = await transaction.rideBooking.findUnique({
            where: { id: bookingId },
            select: chatBookingSelect,
          });
          if (!current || !this.isParticipant(userId, current)) {
            throw new NotFoundException("Chat conversation not found");
          }
          if (!canSendChatMessage(current.status, current.rideOffer.status)) {
            throw new ConflictException("This conversation is read only");
          }
          const recipientUserId =
            current.passengerUserId === userId
              ? current.rideOffer.driverApplication.userId
              : current.passengerUserId;
          const created = await transaction.chatMessage.create({
            data: {
              bookingId,
              senderUserId: userId,
              clientMessageId: input.clientMessageId,
              body,
            },
            select: chatMessageSelect,
          });
          await transaction.userNotification.create({
            data: {
              userId: recipientUserId,
              kind: "chat_message",
              title: "New ride message",
              body: body.slice(0, 500),
              data: {
                bookingId,
                messageId: created.id,
              },
              idempotencyKey: `chat:${created.id}:user:${recipientUserId}`,
            },
          });
          return created;
        },
      );
      return this.toMessage(message);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.findClientMessage(
          userId,
          input.clientMessageId,
        );
        if (existing) {
          return this.resolveDuplicate(existing, bookingId);
        }
      }
      throw error;
    }
  }

  async authorizeRealtime(
    userId: string,
    bookingId: string,
    write: boolean,
  ): Promise<void> {
    const booking = await this.requireParticipant(userId, bookingId);
    if (
      write &&
      !canSendChatMessage(booking.status, booking.rideOffer.status)
    ) {
      throw new ConflictException("This conversation is read only");
    }
  }

  async markRead(
    userId: string,
    bookingId: string,
    input: MarkChatReadInput,
  ): Promise<ChatReadResponse> {
    await this.requireParticipant(userId, bookingId);
    const message = await this.database.client.chatMessage.findFirst({
      where: { id: input.messageId, bookingId },
      select: { id: true, createdAt: true },
    });

    if (!message) {
      throw new NotFoundException("Chat message not found");
    }

    await this.database.client.$executeRaw(Prisma.sql`
      INSERT INTO chat_read_receipts (
        booking_id,
        user_id,
        last_read_message_id,
        read_through_at,
        updated_at
      )
      VALUES (
        ${bookingId}::uuid,
        ${userId}::uuid,
        ${message.id}::uuid,
        ${message.createdAt},
        NOW()
      )
      ON CONFLICT (booking_id, user_id) DO UPDATE
      SET
        last_read_message_id = CASE
          WHEN (
            EXCLUDED.read_through_at,
            EXCLUDED.last_read_message_id
          ) > (
            chat_read_receipts.read_through_at,
            chat_read_receipts.last_read_message_id
          )
            THEN EXCLUDED.last_read_message_id
          ELSE chat_read_receipts.last_read_message_id
        END,
        read_through_at = GREATEST(
          chat_read_receipts.read_through_at,
          EXCLUDED.read_through_at
        ),
        updated_at = NOW()
    `);
    const receipt =
      await this.database.client.chatReadReceipt.findUniqueOrThrow({
        where: { bookingId_userId: { bookingId, userId } },
      });

    return {
      bookingId,
      lastReadMessageId: receipt.lastReadMessageId,
      readThroughAt: receipt.readThroughAt.toISOString(),
    };
  }

  private async requireParticipant(
    userId: string,
    bookingId: string,
  ): Promise<ChatBookingRecord> {
    const booking = await this.database.client.rideBooking.findUnique({
      where: { id: bookingId },
      select: chatBookingSelect,
    });
    const isParticipant = booking ? this.isParticipant(userId, booking) : false;
    const isReadable = booking ? canReadChat(booking.status) : false;

    if (!booking || !isParticipant || !isReadable) {
      throw new NotFoundException("Chat conversation not found");
    }
    return booking;
  }

  private async findClientMessage(
    userId: string,
    clientMessageId: string,
  ): Promise<ChatMessageRecord | null> {
    return this.database.client.chatMessage.findUnique({
      where: {
        senderUserId_clientMessageId: { senderUserId: userId, clientMessageId },
      },
      select: chatMessageSelect,
    });
  }

  private resolveDuplicate(
    message: ChatMessageRecord,
    bookingId: string,
  ): ChatMessageResponse {
    if (message.bookingId !== bookingId) {
      throw new ConflictException("Client message ID has already been used");
    }
    return this.toMessage(message);
  }

  private async unreadCount(
    userId: string,
    bookingId: string,
  ): Promise<number> {
    const receipt = await this.database.client.chatReadReceipt.findUnique({
      where: { bookingId_userId: { bookingId, userId } },
      select: { lastReadMessageId: true, readThroughAt: true },
    });
    return this.database.client.chatMessage.count({
      where: {
        bookingId,
        senderUserId: { not: userId },
        ...(receipt
          ? {
              OR: [
                { createdAt: { gt: receipt.readThroughAt } },
                {
                  createdAt: receipt.readThroughAt,
                  id: { gt: receipt.lastReadMessageId },
                },
              ],
            }
          : {}),
      },
    });
  }

  private async unreadCounts(
    userId: string,
    bookingIds: string[],
  ): Promise<Map<string, number>> {
    if (bookingIds.length === 0) {
      return new Map();
    }
    const rows = await this.database.client.$queryRaw<UnreadCountRow[]>(
      Prisma.sql`
        SELECT
          message.booking_id AS "bookingId",
          COUNT(*)::integer AS count
        FROM chat_messages AS message
        LEFT JOIN chat_read_receipts AS receipt
          ON receipt.booking_id = message.booking_id
          AND receipt.user_id = ${userId}::uuid
        WHERE message.booking_id IN (
          ${Prisma.join(
            bookingIds.map((bookingId) => Prisma.sql`${bookingId}::uuid`),
          )}
        )
          AND message.sender_user_id <> ${userId}::uuid
          AND (
            receipt.booking_id IS NULL
            OR (message.created_at, message.id) > (
              receipt.read_through_at,
              receipt.last_read_message_id
            )
          )
        GROUP BY message.booking_id
      `,
    );
    return new Map(rows.map((row) => [row.bookingId, row.count]));
  }

  private conversationDetails(
    userId: string,
    booking: ChatBookingRecord,
  ): Omit<
    ChatConversationResponse,
    "latestMessage" | "unreadCount" | "readThroughAt"
  > {
    const userIsDriver = booking.rideOffer.driverApplication.userId === userId;
    const participant = userIsDriver
      ? booking.passenger
      : booking.rideOffer.driverApplication.user;

    return {
      bookingId: booking.id,
      bookingStatus: booking.status,
      ride: {
        id: booking.rideOffer.id,
        status: booking.rideOffer.status,
        departureAt: booking.rideOffer.departureAt.toISOString(),
      },
      participant: {
        userId: participant.id,
        displayName: participant.profile?.displayName ?? null,
        role: userIsDriver ? "passenger" : "driver",
      },
    };
  }

  private isParticipant(userId: string, booking: ChatBookingRecord): boolean {
    return (
      booking.passengerUserId === userId ||
      booking.rideOffer.driverApplication.userId === userId
    );
  }

  private toMessage(message: ChatMessageRecord): ChatMessageResponse {
    return {
      id: message.id,
      bookingId: message.bookingId,
      sender: {
        userId: message.senderUserId,
        displayName: message.sender.profile?.displayName ?? null,
      },
      clientMessageId: message.clientMessageId,
      kind: message.kind,
      body: message.body,
      metadata: message.metadata,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
