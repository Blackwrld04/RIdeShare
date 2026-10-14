import { z } from "zod";

export const chatBookingIdSchema = z.uuid();

export const listChatMessagesSchema = z
  .object({
    cursor: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const sendChatMessageSchema = z
  .object({
    clientMessageId: z.uuid(),
    body: z.string().trim().min(1).max(1000),
  })
  .strict();

export const markChatReadSchema = z.object({ messageId: z.uuid() }).strict();

export type ListChatMessagesInput = z.infer<typeof listChatMessagesSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type MarkChatReadInput = z.infer<typeof markChatReadSchema>;
