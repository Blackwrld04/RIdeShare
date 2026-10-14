import { z } from "zod";

const coordinateSchema = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? Number.NaN : value,
    z.coerce.number().min(minimum).max(maximum),
  );

export const routePointSchema = z
  .object({
    label: z.string().trim().min(2).max(120),
    address: z.string().trim().min(2).max(200).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    externalSource: z.string().trim().min(2).max(32).optional(),
    externalId: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.externalSource) === Boolean(value.externalId),
    {
      message: "External source and identifier must be provided together",
    },
  );

export const rideRouteSchema = z
  .object({
    origin: routePointSchema,
    waypoints: z.array(routePointSchema).max(5).default([]),
    destination: routePointSchema,
  })
  .strict()
  .refine(
    (route) =>
      route.origin.latitude !== route.destination.latitude ||
      route.origin.longitude !== route.destination.longitude,
    {
      message: "Origin and destination must be different",
    },
  );

export const createRideSchema = z
  .object({
    departureAt: z.iso.datetime({ offset: true }),
    timezone: z.string().trim().min(1).max(64).default("Africa/Lagos"),
    passengerSeats: z.number().int().min(1).max(7),
    contributionKobo: z.number().int().nonnegative().max(100_000_000),
    currency: z.literal("NGN").default("NGN"),
    notes: z.string().trim().max(280).optional(),
    route: rideRouteSchema,
  })
  .strict();

export const updateRideSchema = z
  .object({
    departureAt: z.iso.datetime({ offset: true }).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    passengerSeats: z.number().int().min(1).max(7).optional(),
    contributionKobo: z
      .number()
      .int()
      .nonnegative()
      .max(100_000_000)
      .optional(),
    notes: z.string().trim().max(280).nullable().optional(),
    route: rideRouteSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one ride field is required",
  });

export const cancelRideSchema = z
  .object({ reason: z.string().trim().min(5).max(280) })
  .strict();

export const rideIdSchema = z.uuid();

export const searchRidesSchema = z
  .object({
    originLatitude: coordinateSchema(-90, 90),
    originLongitude: coordinateSchema(-180, 180),
    destinationLatitude: coordinateSchema(-90, 90),
    destinationLongitude: coordinateSchema(-180, 180),
    radiusMeters: z.coerce.number().int().min(250).max(25_000).default(5_000),
    departureFrom: z.iso.datetime({ offset: true }).optional(),
    departureTo: z.iso.datetime({ offset: true }).optional(),
    seats: z.coerce.number().int().min(1).max(7).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine(
    (value) =>
      !value.departureFrom ||
      !value.departureTo ||
      new Date(value.departureTo) > new Date(value.departureFrom),
    {
      path: ["departureTo"],
      message: "Departure end must be after departure start",
    },
  );

export type RoutePointInput = z.infer<typeof routePointSchema>;
export type RideRouteInput = z.infer<typeof rideRouteSchema>;
export type CreateRideInput = z.infer<typeof createRideSchema>;
export type UpdateRideInput = z.infer<typeof updateRideSchema>;
export type CancelRideInput = z.infer<typeof cancelRideSchema>;
export type SearchRidesInput = z.infer<typeof searchRidesSchema>;
