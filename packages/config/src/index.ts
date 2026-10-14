import { z } from "zod";

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
