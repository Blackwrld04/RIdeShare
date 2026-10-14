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
      SMS_PROVIDER: "console",
      TERMII_BASE_URL: "https://api.ng.termii.com",
      TERMII_SENDER_ID: "CommuteNG",
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
});
