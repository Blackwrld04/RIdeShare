import { z } from "zod";

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    billingEmail: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email().max(255))
      .nullable()
      .optional(),
    bio: z.string().trim().max(280).nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.billingEmail !== undefined ||
      value.bio !== undefined,
    { message: "At least one profile field is required" },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
