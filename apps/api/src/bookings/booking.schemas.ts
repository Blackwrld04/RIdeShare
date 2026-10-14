import { z } from "zod";

const journeySchema = z
  .object({
    pickupLatitude: z.number().min(-90).max(90),
    pickupLongitude: z.number().min(-180).max(180),
    dropoffLatitude: z.number().min(-90).max(90),
    dropoffLongitude: z.number().min(-180).max(180),
    corridorRadiusMeters: z.number().int().min(250).max(25_000).default(5_000),
  })
  .strict();

export const createBookingSchema = z
  .object({
    rideId: z.uuid(),
    seats: z.number().int().min(1).max(7),
    journey: journeySchema.optional(),
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
