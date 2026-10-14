import { z } from "zod";

export const createBookingSchema = z
  .object({
    rideId: z.uuid(),
    seats: z.number().int().min(1).max(7),
  })
  .strict();

export const declineBookingSchema = z
  .object({ reason: z.string().trim().min(5).max(280) })
  .strict();

export const cancelBookingSchema = z
  .object({ reason: z.string().trim().min(5).max(280) })
  .strict();

export const bookingIdSchema = z.uuid();
export const bookingRideIdSchema = z.uuid();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type DeclineBookingInput = z.infer<typeof declineBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
