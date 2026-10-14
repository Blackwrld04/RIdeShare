import { z } from "zod";

const dateOnlySchema = z.iso.date();

const registrationNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replaceAll(" ", ""))
  .pipe(z.string().regex(/^[A-Z0-9-]{5,20}$/));

export const updateDriverDetailsSchema = z
  .object({
    legalFirstName: z.string().trim().min(2).max(80).optional(),
    legalLastName: z.string().trim().min(2).max(80).optional(),
    dateOfBirth: dateOnlySchema.optional(),
    residentialAddress: z.string().trim().min(5).max(160).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    state: z.string().trim().min(2).max(80).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one driver detail is required",
  });

export const upsertDriverVehicleSchema = z
  .object({
    make: z.string().trim().min(2).max(80),
    model: z.string().trim().min(1).max(80),
    color: z.string().trim().min(2).max(40),
    year: z
      .number()
      .int()
      .min(1980)
      .max(new Date().getUTCFullYear() + 1),
    registrationNumber: registrationNumberSchema,
    seatCapacity: z.number().int().min(2).max(8),
  })
  .strict();

export const driverDocumentKindSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{1,63}$/);

export const upsertDriverDocumentSchema = z
  .object({
    storageKey: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/)
      .refine((value) => !value.split("/").includes(".."), {
        message: "Storage key cannot contain parent segments",
      }),
    contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    checksumSha256: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .transform((value) => value.toLowerCase()),
    issuedOn: dateOnlySchema.optional(),
    expiresOn: dateOnlySchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.issuedOn || !value.expiresOn || value.expiresOn >= value.issuedOn,
    {
      path: ["expiresOn"],
      message: "Expiry date cannot be before issue date",
    },
  );

export type UpdateDriverDetailsInput = z.infer<
  typeof updateDriverDetailsSchema
>;
export type UpsertDriverVehicleInput = z.infer<
  typeof upsertDriverVehicleSchema
>;
export type UpsertDriverDocumentInput = z.infer<
  typeof upsertDriverDocumentSchema
>;
