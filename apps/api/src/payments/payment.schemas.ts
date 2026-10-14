import { z } from "zod";

export const initializeCheckoutSchema = z
  .object({ bookingId: z.uuid() })
  .strict();

export const paymentIdSchema = z.uuid();

export const paystackWebhookSchema = z
  .object({
    event: z.string().min(1),
    data: z.object({ reference: z.string().min(1) }).passthrough(),
  })
  .passthrough();

export type InitializeCheckoutInput = z.infer<typeof initializeCheckoutSchema>;
export type PaystackWebhook = z.infer<typeof paystackWebhookSchema>;
