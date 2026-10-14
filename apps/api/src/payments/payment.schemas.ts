import { z } from "zod";

export const initializeCheckoutSchema = z
  .object({ bookingId: z.uuid() })
  .strict();

export const paymentIdSchema = z.uuid();
export const refundIdSchema = z.uuid();

export const paystackWebhookSchema = z
  .object({
    event: z.string().min(1),
    data: z
      .object({
        reference: z.string().min(1).optional(),
        transaction_reference: z.string().min(1).optional(),
        amount: z
          .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
          .optional(),
        currency: z.string().length(3).optional(),
        status: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type InitializeCheckoutInput = z.infer<typeof initializeCheckoutSchema>;
export type PaystackWebhook = z.infer<typeof paystackWebhookSchema>;
