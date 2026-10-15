import { z } from "zod";

const coordinateSchema = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? Number.NaN : value,
    z.coerce.number().min(minimum).max(maximum),
  );

const landmarkFields = {
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(64),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  externalSource: z.string().trim().min(2).max(32).optional(),
  externalId: z.string().trim().min(1).max(128).optional(),
  safetyNotes: z.string().trim().min(2).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

const landmarkObjectSchema = z.object(landmarkFields);

export const searchLandmarksSchema = z
  .object({
    q: z.string().trim().min(2).max(120).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    category: z.string().trim().min(2).max(64).optional(),
    latitude: coordinateSchema(-90, 90).optional(),
    longitude: coordinateSchema(-180, 180).optional(),
    radiusMeters: z.coerce.number().int().min(250).max(50_000).default(10_000),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine(
    (value) =>
      (value.latitude === undefined) === (value.longitude === undefined),
    {
      message: "Latitude and longitude must be provided together",
    },
  );

export const createLandmarkSchema = z
  .object(landmarkObjectSchema.shape)
  .strict()
  .refine(
    (value) => Boolean(value.externalSource) === Boolean(value.externalId),
    { message: "External source and identifier must be provided together" },
  );

export const updateLandmarkSchema = z
  .object({
    ...landmarkObjectSchema.partial().shape,
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one landmark field is required",
  })
  .refine(
    (value) =>
      (value.externalSource === undefined) === (value.externalId === undefined),
    {
      message: "External source and identifier must be provided together",
    },
  );

export const landmarkIdSchema = z.uuid();

export type SearchLandmarksInput = z.infer<typeof searchLandmarksSchema>;
export type CreateLandmarkInput = z.infer<typeof createLandmarkSchema>;
export type UpdateLandmarkInput = z.infer<typeof updateLandmarkSchema>;
