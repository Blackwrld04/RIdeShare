import { z } from "zod";

export const PAYOUT_QUEUE_NAME = "driver-payouts";
export const PROCESS_PAYOUT_JOB = "process-payout";
export const RECONCILE_PAYOUTS_JOB = "reconcile-payouts";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_HOST: z.string().min(1).default("0.0.0.0"),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    REDIS_URL: z.string().url().startsWith("redis://"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug"])
      .default("info"),
    AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
    AUTH_REFRESH_TOKEN_SECRET: z.string().min(32),
    AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .max(3_600)
      .default(900),
    AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .default(30),
    OTP_HMAC_SECRET: z.string().min(32),
    OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
    OTP_REQUEST_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .min(30)
      .max(300)
      .default(60),
    OTP_REQUEST_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .max(3_600)
      .default(900),
    OTP_MAX_REQUESTS_PER_WINDOW: z.coerce
      .number()
      .int()
      .min(3)
      .max(20)
      .default(5),
    OTP_DEV_CODE: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    SMS_PROVIDER: z.enum(["console", "termii"]).default("console"),
    TERMII_BASE_URL: z.string().url().default("https://api.ng.termii.com"),
    TERMII_API_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).optional(),
    ),
    TERMII_SENDER_ID: z.string().min(3).max(11).default("CommuteNG"),
    PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),
    PAYSTACK_SECRET_KEY: z.string().min(16).startsWith("sk_test_"),
    PAYSTACK_CALLBACK_URL: z
      .string()
      .url()
      .default("http://localhost:3000/payments/callback"),
    PLATFORM_FEE_BASIS_POINTS: z.coerce
      .number()
      .int()
      .min(0)
      .max(5_000)
      .default(1_500),
    PAYOUT_DELAY_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    PAYOUT_RECONCILIATION_SECONDS: z.coerce
      .number()
      .int()
      .min(15)
      .max(3_600)
      .default(60),
    STORAGE_ENDPOINT: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().url().optional(),
    ),
    STORAGE_REGION: z.string().min(1).default("us-east-1"),
    STORAGE_BUCKET: z.string().min(3).max(63),
    STORAGE_ACCESS_KEY_ID: z.string().min(3),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(8),
    STORAGE_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    UPLOAD_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(3_600)
      .default(900),
    UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1_048_576)
      .max(52_428_800)
      .default(10_485_760),
  })
  .superRefine((config, context) => {
    if (config.SMS_PROVIDER === "termii" && !config.TERMII_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["TERMII_API_KEY"],
        message: "TERMII_API_KEY is required when SMS_PROVIDER is termii",
      });
    }

    if (config.SMS_PROVIDER === "console" && !config.OTP_DEV_CODE) {
      context.addIssue({
        code: "custom",
        path: ["OTP_DEV_CODE"],
        message: "OTP_DEV_CODE is required when SMS_PROVIDER is console",
      });
    }

    if (config.NODE_ENV === "production" && config.SMS_PROVIDER !== "termii") {
      context.addIssue({
        code: "custom",
        path: ["SMS_PROVIDER"],
        message: "Production requires the termii SMS provider",
      });
    }

    if (config.NODE_ENV === "production" && config.OTP_DEV_CODE) {
      context.addIssue({
        code: "custom",
        path: ["OTP_DEV_CODE"],
        message: "OTP_DEV_CODE cannot be set in production",
      });
    }
  });

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}
