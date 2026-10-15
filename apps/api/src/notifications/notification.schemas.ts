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

const pushKeySchema = z
  .string()
  .min(8)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+={0,2}$/);

export const registerWebPushSubscriptionSchema = z
  .object({
    endpoint: z
      .url()
      .max(2_048)
      .refine((value) => new URL(value).protocol === "https:"),
    expirationTime: z.number().finite().nonnegative().nullable().optional(),
    keys: z
      .object({
        p256dh: pushKeySchema.min(40),
        auth: pushKeySchema,
      })
      .strict(),
  })
  .strict();

export const webPushSubscriptionIdSchema = z.uuid();

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type RegisterWebPushSubscriptionInput = z.infer<
  typeof registerWebPushSubscriptionSchema
>;
