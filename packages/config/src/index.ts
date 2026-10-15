import { z } from "zod";

const identityEncryptionKeySchema = z.string().refine((value) => {
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}, "IDENTITY_ENCRYPTION_KEY must be a base64-encoded 32-byte key");

const corsOriginsSchema = z
  .string()
  .default("http://localhost:5173")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .refine(
    (origins) =>
      origins.length > 0 &&
      origins.every((origin) => {
        try {
          const url = new URL(origin);
          return (
            url.origin === origin && ["http:", "https:"].includes(url.protocol)
          );
        } catch {
          return false;
        }
      }),
    "CORS_ORIGINS must contain comma-separated HTTP origins",
  );

const trustedProxySchema = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

export const PAYOUT_QUEUE_NAME = "driver-payouts";
export const PROCESS_PAYOUT_JOB = "process-payout";
export const RECONCILE_PAYOUTS_JOB = "reconcile-payouts";
export const RIDE_SCHEDULING_QUEUE_NAME = "ride-scheduling";
export const MATERIALIZE_RIDE_SERIES_JOB = "materialize-ride-series";
export const MATERIALIZE_ACTIVE_RIDE_SERIES_JOB =
  "materialize-active-ride-series";
export const CREATE_RIDE_REMINDERS_JOB = "create-ride-reminders";
export const WEB_PUSH_QUEUE_NAME = "web-push";
export const DISPATCH_WEB_PUSH_JOB = "dispatch-web-push";

const optionalString = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const vapidSubjectSchema = z.string().refine((value) => {
  try {
    const subject = new URL(value);
    return subject.protocol === "mailto:" || subject.protocol === "https:";
  } catch {
    return false;
  }
}, "WEB_PUSH_VAPID_SUBJECT must be a mailto or HTTPS URL");

const vapidKeySchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

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
    CORS_ORIGINS: corsOriginsSchema,
    TRUSTED_PROXY_CIDRS: trustedProxySchema,
    API_RATE_LIMIT_MAX: z.coerce
      .number()
      .int()
      .min(10)
      .max(10_000)
      .default(300),
    API_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(3_600)
      .default(60),
    API_BODY_LIMIT_BYTES: z.coerce
      .number()
      .int()
      .min(65_536)
      .max(10_485_760)
      .default(1_048_576),
    API_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(120_000)
      .default(15_000),
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
    NIN_PROVIDER: z.literal("ninja").default("ninja"),
    NINJA_BASE_URL: z
      .string()
      .url()
      .default("https://api.sandbox.ninja.boucloud.io"),
    NINJA_PUBLIC_KEY: z.string().min(1),
    NINJA_SECRET_KEY: z.string().min(1),
    NIN_CONSENT_VERSION: z.string().min(1).max(32).default("2026-10-01"),
    NIN_RETRY_COOLDOWN_SECONDS: z.coerce
      .number()
      .int()
      .min(10)
      .max(3_600)
      .default(60),
    IDENTITY_ENCRYPTION_KEY: identityEncryptionKeySchema,
    IDENTITY_HMAC_SECRET: z.string().min(32),
    SMS_PROVIDER: z.enum(["console", "termii"]).default("console"),
    TERMII_BASE_URL: z.string().url().default("https://api.ng.termii.com"),
    TERMII_API_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).optional(),
    ),
    TERMII_SENDER_ID: z.string().min(3).max(11).default("CommuteNG"),
    WEB_PUSH_PROVIDER: z.enum(["console", "vapid"]).default("console"),
    WEB_PUSH_VAPID_SUBJECT: optionalString(vapidSubjectSchema),
    WEB_PUSH_VAPID_PUBLIC_KEY: optionalString(vapidKeySchema.min(80).max(100)),
    WEB_PUSH_VAPID_PRIVATE_KEY: optionalString(vapidKeySchema.min(40).max(60)),
    WEB_PUSH_SCAN_SECONDS: z.coerce.number().int().min(5).max(300).default(15),
    WEB_PUSH_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    WEB_PUSH_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(86_400)
      .default(3_600),
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
    MIN_SEGMENT_CONTRIBUTION_KOBO: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .default(50_000),
    MAX_CONTRIBUTION_KOBO_PER_KM: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(1_000_000)
      .default(50_000),
    MAX_RIDE_CONTRIBUTION_KOBO: z.coerce
      .number()
      .int()
      .min(50_000)
      .max(100_000_000)
      .default(5_000_000),
    RIDE_START_EARLY_MINUTES: z.coerce
      .number()
      .int()
      .min(0)
      .max(240)
      .default(60),
    TRAFFIC_GRACE_MINUTES: z.coerce.number().int().min(0).max(180).default(30),
    CHECKOUT_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    CHECKOUT_ATTEMPT_WINDOW_MINUTES: z.coerce
      .number()
      .int()
      .min(5)
      .max(1_440)
      .default(30),
    RIDE_SERIES_MATERIALIZATION_SECONDS: z.coerce
      .number()
      .int()
      .min(900)
      .max(86_400)
      .default(21_600),
    RIDE_REMINDER_SCAN_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(3_600)
      .default(900),
    EMERGENCY_CALL_NUMBER: z.string().trim().min(3).max(20).default("112"),
    SAFETY_SHARE_MAX_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(720)
      .default(168),
    LOCATION_PING_MIN_INTERVAL_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(60)
      .default(2),
    GEOCODING_BASE_URL: z
      .string()
      .url()
      .default("https://nominatim.openstreetmap.org"),
    GEOCODING_USER_AGENT: z
      .string()
      .trim()
      .min(8)
      .max(200)
      .default("CommuteShare/1.0"),
    GEOCODING_CACHE_SECONDS: z.coerce
      .number()
      .int()
      .min(3_600)
      .max(2_592_000)
      .default(604_800),
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
    KYC_INSPECTION_MAX_BYTES: z.coerce
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

    if (
      config.WEB_PUSH_PROVIDER === "vapid" &&
      (!config.WEB_PUSH_VAPID_SUBJECT ||
        !config.WEB_PUSH_VAPID_PUBLIC_KEY ||
        !config.WEB_PUSH_VAPID_PRIVATE_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["WEB_PUSH_VAPID_PRIVATE_KEY"],
        message: "VAPID subject, public key, and private key are required",
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

    if (
      config.NODE_ENV === "production" &&
      config.WEB_PUSH_PROVIDER !== "vapid"
    ) {
      context.addIssue({
        code: "custom",
        path: ["WEB_PUSH_PROVIDER"],
        message: "Production requires the VAPID web push provider",
      });
    }

    if (
      config.NODE_ENV === "production" &&
      new URL(config.NINJA_BASE_URL).hostname.includes("sandbox")
    ) {
      context.addIssue({
        code: "custom",
        path: ["NINJA_BASE_URL"],
        message: "Production requires the live Ninja API",
      });
    }

    if (
      config.NODE_ENV === "production" &&
      config.CORS_ORIGINS.some((origin) => {
        const url = new URL(origin);
        return url.protocol !== "https:" || url.hostname === "localhost";
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message:
          "Production CORS origins must use HTTPS and cannot use localhost",
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
