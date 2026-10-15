import { loadConfig } from "@commuteshare/config";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { JoseSocialIdentityVerifier } from "./social-identity.verifier.js";

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
  GOOGLE_OIDC_CLIENT_IDS: "commuteshare-web.apps.googleusercontent.com",
});

describe("JoseSocialIdentityVerifier", () => {
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  let fetchImplementation: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const keys = await generateKeyPair("RS256");
    privateKey = keys.privateKey;
    const publicKey = await exportJWK(keys.publicKey);
    fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        keys: [{ ...publicKey, kid: "google-key", alg: "RS256", use: "sig" }],
      }),
    );
  });

  it("verifies Google signature, issuer, audience, expiry, and nonce", async () => {
    const token = await new SignJWT({
      nonce: "social-nonce",
      email: "rider@example.com",
      email_verified: true,
      name: "Rider Name",
    })
      .setProtectedHeader({ alg: "RS256", kid: "google-key" })
      .setIssuer("https://accounts.google.com")
      .setAudience("commuteshare-web.apps.googleusercontent.com")
      .setSubject("google-user-123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const verifier = new JoseSocialIdentityVerifier(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(verifier.verify("google", token)).resolves.toEqual({
      provider: "google",
      subject: "google-user-123",
      email: "rider@example.com",
      displayName: "Rider Name",
      nonce: "social-nonce",
    });
  });

  it("rejects a token issued for another client", async () => {
    const token = await new SignJWT({ nonce: "social-nonce" })
      .setProtectedHeader({ alg: "RS256", kid: "google-key" })
      .setIssuer("https://accounts.google.com")
      .setAudience("another-client")
      .setSubject("google-user-123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const verifier = new JoseSocialIdentityVerifier(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(verifier.verify("google", token)).rejects.toMatchObject({
      status: 401,
    });
  });
});
