import { z } from "zod";
import { rideRouteSchema } from "./ride.schemas.js";

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");

export const createRideSeriesSchema = z
  .object({
    timezone: timezoneSchema.default("Africa/Lagos"),
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine((days) => new Set(days).size === days.length),
    startsOn: z.iso.date(),
    endsOn: z.iso.date().optional(),
    lookaheadDays: z.number().int().min(1).max(30).default(14),
    passengerSeats: z.number().int().min(1).max(7),
    contributionKobo: z.number().int().nonnegative().max(100_000_000),
    currency: z.literal("NGN").default("NGN"),
    womenOnly: z.boolean().default(false),
    notes: z.string().trim().max(280).optional(),
    route: rideRouteSchema.refine(
      (route) =>
        route.path !== undefined &&
        route.distanceMeters !== undefined &&
        route.durationSeconds !== undefined,
      { message: "Recurring rides require complete route geometry" },
    ),
  })
  .strict()
  .refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
    path: ["endsOn"],
    message: "Series end date cannot be before its start date",
  });

export const rideSeriesIdSchema = z.uuid();

export type CreateRideSeriesInput = z.infer<typeof createRideSeriesSchema>;
