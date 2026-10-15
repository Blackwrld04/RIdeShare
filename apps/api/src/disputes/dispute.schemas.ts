import { z } from "zod";

export const disputeBookingIdSchema = z.uuid();
export const disputeIdSchema = z.uuid();

export const createDisputeSchema = z
  .object({ reason: z.string().trim().min(20).max(1000) })
  .strict();

export const listDisputesSchema = z
  .object({
    status: z.enum(["OPEN", "RELEASED", "REFUNDED"]).optional(),
    cursor: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const resolveDisputeSchema = z
  .object({
    action: z.enum(["release", "refund"]),
    note: z.string().trim().min(10).max(1000),
  })
  .strict();

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type ListDisputesInput = z.infer<typeof listDisputesSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
