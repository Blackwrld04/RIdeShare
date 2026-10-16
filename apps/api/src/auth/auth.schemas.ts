import { z } from "zod";

export const requestOtpSchema = z
  .object({
    phone: z.string().trim().min(3).max(255).optional(),
    email: z.string().trim().email().optional(),
    identifier: z.string().trim().min(3).max(255).optional(),
  })
  .refine((data) => Boolean(data.phone || data.email || data.identifier), {
    message: "Either phone, email, or identifier must be provided",
  });

export const verifyOtpSchema = z
  .object({
    challengeId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const refreshSessionSchema = z
  .object({
    refreshToken: z.string().min(40).max(256),
  })
  .strict();

export const socialProviderSchema = z.enum(["google", "apple"]);

export const createSocialChallengeSchema = z
  .object({ provider: socialProviderSchema })
  .strict();

export const socialCredentialSchema = z
  .object({
    challengeId: z.uuid(),
    idToken: z.string().min(100).max(16_384),
    authorizationCode: z.string().min(1).max(4_096).optional(),
  })
  .strict();

export const registerRequestOtpSchema = z
  .object({
    email: z.string().trim().email("Please provide a valid email address"),
    displayName: z.string().trim().min(2).max(100).optional(),
  })
  .strict();

export const registerCompleteSchema = z
  .object({
    challengeId: z.string().uuid("Invalid challenge ID"),
    code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128),
    displayName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().optional(),
  })
  .strict();

export const passwordLoginSchema = z
  .object({
    email: z.string().trim().email().optional(),
    identifier: z.string().trim().min(3).max(255).optional(),
    password: z.string().min(1, "Password is required").max(128),
  })
  .refine((data) => Boolean(data.email || data.identifier), {
    message: "Either email or identifier must be provided",
  });

export const setPasswordSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(128),
  })
  .strict();

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
export type SocialProvider = z.infer<typeof socialProviderSchema>;
export type CreateSocialChallengeInput = z.infer<
  typeof createSocialChallengeSchema
>;
export type SocialCredentialInput = z.infer<typeof socialCredentialSchema>;
export type RegisterRequestOtpInput = z.infer<typeof registerRequestOtpSchema>;
export type RegisterCompleteInput = z.infer<typeof registerCompleteSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
