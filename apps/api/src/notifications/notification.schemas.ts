import { z } from "zod";

export const listNotificationsSchema = z
  .object({
    unreadOnly: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();

export const notificationIdSchema = z.uuid();

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
