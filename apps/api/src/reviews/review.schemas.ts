import { z } from "zod";

export const reviewBookingIdSchema = z.uuid();
export const reviewUserIdSchema = z.uuid();

export const createReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const listReviewsSchema = z
  .object({
    cursor: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsInput = z.infer<typeof listReviewsSchema>;
