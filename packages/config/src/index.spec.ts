import { describe, expect, it } from "vitest";
import { loadConfig } from "./index.js";

const requiredEnvironment = {
  DATABASE_URL:
    "postgresql://commuteshare:commuteshare@localhost:5432/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "c".repeat(32),
  OTP_HMAC_SECRET: "b".repeat(32),
  OTP_DEV_CODE: "000000",
  NINJA_PUBLIC_KEY: "ninja-public-key",
  NINJA_SECRET_KEY: "ninja-secret-key",
  IDENTITY_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  IDENTITY_HMAC_SECRET: "identity-hmac-secret-change-me-0001",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
};

describe("loadConfig", () => {
  it("applies development defaults", () => {
    expect(loadConfig(requiredEnvironment)).toEqual({
      NODE_ENV: "development",
      API_HOST: "0.0.0.0",
      API_PORT: 3000,
      DATABASE_URL: requiredEnvironment.DATABASE_URL,
      REDIS_URL: requiredEnvironment.REDIS_URL,
      LOG_LEVEL: "info",
      CORS_ORIGINS: ["http://localhost:5173"],
      TRUSTED_PROXY_CIDRS: [],
      API_RATE_LIMIT_MAX: 300,
      API_RATE_LIMIT_WINDOW_SECONDS: 60,
      API_BODY_LIMIT_BYTES: 1_048_576,
      API_REQUEST_TIMEOUT_MS: 15_000,
      AUTH_ACCESS_TOKEN_SECRET: requiredEnvironment.AUTH_ACCESS_TOKEN_SECRET,
      AUTH_REFRESH_TOKEN_SECRET: requiredEnvironment.AUTH_REFRESH_TOKEN_SECRET,
      AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
      AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
      OTP_HMAC_SECRET: requiredEnvironment.OTP_HMAC_SECRET,
      OTP_TTL_SECONDS: 300,
      OTP_MAX_ATTEMPTS: 5,
      OTP_REQUEST_COOLDOWN_SECONDS: 60,
      OTP_REQUEST_WINDOW_SECONDS: 900,
      OTP_MAX_REQUESTS_PER_WINDOW: 5,
      OTP_DEV_CODE: "000000",
      NIN_PROVIDER: "ninja",
      NINJA_BASE_URL: "https://api.sandbox.ninja.boucloud.io",
      NINJA_PUBLIC_KEY: requiredEnvironment.NINJA_PUBLIC_KEY,
      NINJA_SECRET_KEY: requiredEnvironment.NINJA_SECRET_KEY,
      NIN_CONSENT_VERSION: "2026-10-01",
      NIN_RETRY_COOLDOWN_SECONDS: 60,
      IDENTITY_ENCRYPTION_KEY: requiredEnvironment.IDENTITY_ENCRYPTION_KEY,
      IDENTITY_HMAC_SECRET: requiredEnvironment.IDENTITY_HMAC_SECRET,
      SMS_PROVIDER: "console",
      TERMII_BASE_URL: "https://api.ng.termii.com",
      TERMII_SENDER_ID: "CommuteNG",
      WEB_PUSH_PROVIDER: "console",
      WEB_PUSH_SCAN_SECONDS: 15,
      WEB_PUSH_MAX_ATTEMPTS: 5,
      WEB_PUSH_TTL_SECONDS: 3_600,
      PAYSTACK_BASE_URL: "https://api.paystack.co",
      PAYSTACK_SECRET_KEY: requiredEnvironment.PAYSTACK_SECRET_KEY,
      PAYSTACK_CALLBACK_URL: "http://localhost:3000/payments/callback",
      PLATFORM_FEE_BASIS_POINTS: 1_500,
      MIN_SEGMENT_CONTRIBUTION_KOBO: 50_000,
      RIDE_SERIES_MATERIALIZATION_SECONDS: 21_600,
      RIDE_REMINDER_SCAN_SECONDS: 900,
      EMERGENCY_CALL_NUMBER: "112",
      SAFETY_SHARE_MAX_HOURS: 168,
      LOCATION_PING_MIN_INTERVAL_SECONDS: 2,
      PAYOUT_DELAY_HOURS: 24,
      PAYOUT_RECONCILIATION_SECONDS: 60,
      STORAGE_REGION: "us-east-1",
      STORAGE_BUCKET: "commuteshare-private",
      STORAGE_ACCESS_KEY_ID: "commuteshare",
      STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
      STORAGE_FORCE_PATH_STYLE: false,
      UPLOAD_URL_TTL_SECONDS: 900,
      UPLOAD_MAX_BYTES: 10_485_760,
    });
  });

  it("coerces a valid API port", () => {
    expect(
      loadConfig({ ...requiredEnvironment, API_PORT: "4100" }).API_PORT,
    ).toBe(4100);
  });

  it("rejects missing infrastructure configuration", () => {
    expect(() => loadConfig({})).toThrow("DATABASE_URL");
  });

  it("rejects console OTP delivery in production", () => {
    expect(() =>
      loadConfig({ ...requiredEnvironment, NODE_ENV: "production" }),
    ).toThrow("SMS_PROVIDER");
  });

  it("requires Termii credentials when selected", () => {
    expect(() =>
      loadConfig({ ...requiredEnvironment, SMS_PROVIDER: "termii" }),
    ).toThrow("TERMII_API_KEY");
  });

  it("requires a complete VAPID configuration when selected", () => {
    expect(() =>
      loadConfig({ ...requiredEnvironment, WEB_PUSH_PROVIDER: "vapid" }),
    ).toThrow("VAPID");
  });

  it("coerces storage flags and upload limits", () => {
    const config = loadConfig({
      ...requiredEnvironment,
      STORAGE_FORCE_PATH_STYLE: "true",
      UPLOAD_MAX_BYTES: "2097152",
    });

    expect(config.STORAGE_FORCE_PATH_STYLE).toBe(true);
    expect(config.UPLOAD_MAX_BYTES).toBe(2_097_152);
  });

  it("rejects live Paystack keys while sandbox mode is enforced", () => {
    expect(() =>
      loadConfig({
        ...requiredEnvironment,
        PAYSTACK_SECRET_KEY: "sk_live_commuteshare_local",
      }),
    ).toThrow("PAYSTACK_SECRET_KEY");
  });

  it("requires an exact AES-256 identity key", () => {
    expect(() =>
      loadConfig({
        ...requiredEnvironment,
        IDENTITY_ENCRYPTION_KEY: Buffer.from("too-short").toString("base64"),
      }),
    ).toThrow("IDENTITY_ENCRYPTION_KEY");
  });

  it("rejects the Ninja sandbox in production", () => {
    expect(() =>
      loadConfig({
        ...requiredEnvironment,
        NODE_ENV: "production",
        SMS_PROVIDER: "termii",
        TERMII_API_KEY: "termii-key",
        OTP_DEV_CODE: undefined,
      }),
    ).toThrow("NINJA_BASE_URL");
  });

  it("parses explicit browser origins and trusted proxies", () => {
    const config = loadConfig({
      ...requiredEnvironment,
      CORS_ORIGINS: "https://app.example.com, https://admin.example.com",
      TRUSTED_PROXY_CIDRS: "127.0.0.1, 10.0.0.0/8",
    });

    expect(config.CORS_ORIGINS).toEqual([
      "https://app.example.com",
      "https://admin.example.com",
    ]);
    expect(config.TRUSTED_PROXY_CIDRS).toEqual(["127.0.0.1", "10.0.0.0/8"]);
  });

  it("rejects insecure production browser origins", () => {
    expect(() =>
      loadConfig({
        ...requiredEnvironment,
        NODE_ENV: "production",
        SMS_PROVIDER: "termii",
        TERMII_API_KEY: "termii-key",
        OTP_DEV_CODE: undefined,
        NINJA_BASE_URL: "https://api.ninja.boucloud.io",
        CORS_ORIGINS: "http://app.example.com",
      }),
    ).toThrow("CORS_ORIGINS");
  });
});
