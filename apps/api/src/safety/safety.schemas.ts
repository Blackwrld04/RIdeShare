import { z } from "zod";

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);
const accuracySchema = z.number().min(0).max(10_000).optional();

export const safetyRideIdSchema = z.uuid();
export const emergencyContactIdSchema = z.uuid();
export const shareLinkIdSchema = z.uuid();
export const safetyAlertIdSchema = z.uuid();
export const publicShareTokenSchema = z
  .string()
  .min(40)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

export const createEmergencyContactSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(10).max(20),
    relationship: z.string().trim().min(2).max(40).optional(),
    isPrimary: z.boolean().default(false),
  })
  .strict();

export const createShareLinkSchema = z
  .object({
    label: z.string().trim().min(2).max(80).optional(),
    expiresInHours: z.number().int().min(1).max(720).default(24),
  })
  .strict();

export const locationPingSchema = z
  .object({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    accuracyMeters: accuracySchema,
    headingDegrees: z.number().int().min(0).max(359).optional(),
    speedMetersPerSecond: z.number().min(0).max(200).optional(),
    recordedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();

export const createSosAlertSchema = z
  .object({
    clientAlertId: z.uuid(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    accuracyMeters: accuracySchema,
    message: z.string().trim().min(2).max(500).optional(),
  })
  .strict();

export const resolveSosAlertSchema = z
  .object({ note: z.string().trim().min(2).max(500) })
  .strict();

export type CreateEmergencyContactInput = z.infer<
  typeof createEmergencyContactSchema
>;
export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
export type LocationPingInput = z.infer<typeof locationPingSchema>;
export type CreateSosAlertInput = z.infer<typeof createSosAlertSchema>;
export type ResolveSosAlertInput = z.infer<typeof resolveSosAlertSchema>;
