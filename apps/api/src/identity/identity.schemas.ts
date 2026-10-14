import { z } from "zod";

const legalNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .transform((value) => value.replace(/\s+/g, " "));

export const verifyNinSchema = z
  .object({
    nin: z.string().regex(/^\d{11}$/),
    legalFirstName: legalNameSchema,
    legalLastName: legalNameSchema,
    dateOfBirth: z.iso.date(),
    consent: z.literal(true),
    consentVersion: z.string().min(1).max(32),
  })
  .strict();

export type VerifyNinInput = z.infer<typeof verifyNinSchema>;
