import { z } from "zod";

export const UPLOAD_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const createUploadSchema = z
  .object({
    purpose: z.enum(["driver_document"]),
    contentType: z.enum(UPLOAD_CONTENT_TYPES),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
    checksumSha256: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export const uploadIdSchema = z.uuid();

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
