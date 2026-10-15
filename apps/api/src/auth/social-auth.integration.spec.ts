import { randomUUID } from "node:crypto";
import { loadConfig } from "@commuteshare/config";
import { createDatabase, type Database } from "@commuteshare/database";
import { UnauthorizedException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { AuthService } from "./auth.service.js";
import type { OtpDelivery } from "./otp-delivery.js";
import type {
  SocialIdentity,
  SocialIdentityVerifier,
} from "./social-identity.verifier.js";
import { TokenService } from "./token.service.js";

const describeIntegration = process.env.SOCIAL_AUTH_TEST_DATABASE_URL
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

describeIntegration("social auth integration", () => {
  let database: Database;
  let auth: AuthService;
  let tokens: TokenService;
  let userId: string;
  const challengeIds: string[] = [];
  let identity: SocialIdentity;
  const verifier = {
    verify: vi.fn().mockImplementation(async () => identity),
  } as unknown as SocialIdentityVerifier;

  beforeAll(async () => {
    const databaseUrl = process.env.SOCIAL_AUTH_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("SOCIAL_AUTH_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    tokens = new TokenService(config);
    auth = new AuthService(
      config,
      database as unknown as DatabaseService,
      { send: vi.fn() } as unknown as OtpDelivery,
      tokens,
      verifier,
    );
    const suffix = randomUUID().replaceAll("-", "").slice(0, 6);
    const user = await database.client.user.create({
      data: {
        phoneE164: `+234851${suffix}`,
        phoneVerifiedAt: new Date(),
        profile: { create: {} },
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await database.client.socialAuthChallenge.deleteMany({
      where: { id: { in: challengeIds } },
    });
    await database.client.user.delete({ where: { id: userId } });
    await database.close();
  });

  it("links a verified social identity to a phone account", async () => {
    const challenge = await auth.createSocialChallenge({ provider: "google" });
    challengeIds.push(challenge.challengeId);
    identity = {
      provider: "google",
      subject: "google-subject-123",
      email: "linked@example.com",
      displayName: "Linked Rider",
      nonce: challenge.nonce,
    };

    await expect(
      auth.linkSocialAccount(userId, {
        challengeId: challenge.challengeId,
        idToken: "verified-token",
      }),
    ).resolves.toMatchObject({
      provider: "google",
      email: "linked@example.com",
    });
    await expect(auth.listSocialAccounts(userId)).resolves.toHaveLength(1);
  });

  it("logs in through the linked identity and prevents nonce replay", async () => {
    const challenge = await auth.createSocialChallenge({ provider: "google" });
    challengeIds.push(challenge.challengeId);
    identity = { ...identity, nonce: challenge.nonce };
    const input = {
      challengeId: challenge.challengeId,
      idToken: "verified-token",
    };

    const session = await auth.socialLogin(input);
    await expect(
      tokens.verifyAccessToken(session.accessToken),
    ).resolves.toMatchObject({ userId });
    await expect(auth.socialLogin(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
