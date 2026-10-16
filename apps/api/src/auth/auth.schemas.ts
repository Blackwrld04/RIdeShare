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

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
export type SocialProvider = z.infer<typeof socialProviderSchema>;
export type CreateSocialChallengeInput = z.infer<
  typeof createSocialChallengeSchema
>;
export type SocialCredentialInput = z.infer<typeof socialCredentialSchema>;
