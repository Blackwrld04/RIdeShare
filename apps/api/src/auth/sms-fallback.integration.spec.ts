import { loadConfig } from "@commuteshare/config";
import { createDatabase, type Database } from "@commuteshare/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { AuthService } from "./auth.service.js";
import type { OtpDelivery } from "./otp-delivery.js";
import type { SocialIdentityVerifier } from "./social-identity.verifier.js";
import { TokenService } from "./token.service.js";

const describeIntegration = process.env.SMS_FALLBACK_TEST_DATABASE_URL
  ? describe
  : describe.skip;

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  OTP_DEV_CODE: "000000",
  NINJA_PUBLIC_KEY: "ninja-public-key",
  NINJA_SECRET_KEY: "ninja-secret-key",
  IDENTITY_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  IDENTITY_HMAC_SECRET: "identity-hmac-secret-change-me-0001",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
});

describeIntegration("SMS fallback integration", () => {
  let database: Database;
  let auth: AuthService;
  let challengeId: string;
  const delivery = {
    send: vi.fn().mockResolvedValue("africastalking"),
  } as unknown as OtpDelivery;

  beforeAll(() => {
    const databaseUrl = process.env.SMS_FALLBACK_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("SMS_FALLBACK_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    auth = new AuthService(
      config,
      database as unknown as DatabaseService,
      delivery,
      new TokenService(config),
      {} as SocialIdentityVerifier,
    );
  });

  afterAll(async () => {
    await database.client.phoneOtpChallenge.deleteMany({
      where: { id: challengeId },
    });
    await database.close();
  });

  it("records the provider that accepted the OTP", async () => {
    const response = await auth.requestOtp({
      phone: `080${String(Date.now()).slice(-8)}`,
    });
    challengeId = response.challengeId;
    const challenge = await database.client.phoneOtpChallenge.findUniqueOrThrow(
      {
        where: { id: challengeId },
      },
    );

    expect(challenge.deliveryProvider).toBe("africastalking");
    expect(delivery.send).toHaveBeenCalledOnce();
  });
});
