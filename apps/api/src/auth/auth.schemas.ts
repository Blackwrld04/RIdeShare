import { z } from "zod";

export const requestOtpSchema = z
  .object({
    phone: z.string().trim().min(10).max(20),
  })
  .strict();

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

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
