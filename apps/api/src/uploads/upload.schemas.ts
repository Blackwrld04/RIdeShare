import { z } from "zod";
import { isKycContentTypeAllowed } from "./kyc-media.policy.js";

export const UPLOAD_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const createUploadSchema = z
  .object({
    purpose: z.enum(["driver_document"]),
    documentKind: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z][a-z0-9_]{1,63}$/),
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
  .strict()
  .refine(
    (value) => isKycContentTypeAllowed(value.documentKind, value.contentType),
    {
      path: ["contentType"],
      message: "Content type is not allowed for this document kind",
    },
  );

export const uploadIdSchema = z.uuid();

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
