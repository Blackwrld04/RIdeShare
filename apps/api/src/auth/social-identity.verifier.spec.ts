import { loadConfig } from "@commuteshare/config";
import {
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
  SignJWT,
} from "jose";
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

  it("exchanges Apple web authorization codes with a signed client secret", async () => {
    const appleIdentityKeys = await generateKeyPair("RS256");
    const appleClientKeys = await generateKeyPair("ES256", {
      extractable: true,
    });
    const applePublicJwk = await exportJWK(appleIdentityKeys.publicKey);
    const applePrivateKey = await exportPKCS8(appleClientKeys.privateKey);
    const appleToken = await new SignJWT({
      nonce: "apple-social-nonce",
      email: "apple-rider@example.com",
    })
      .setProtectedHeader({ alg: "RS256", kid: "apple-key" })
      .setIssuer("https://appleid.apple.com")
      .setAudience("ng.commuteshare.web")
      .setSubject("apple-user-123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(appleIdentityKeys.privateKey);
    const appleFetch = vi.fn(
      async (input: string | URL | Request, _init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url === "https://appleid.apple.com/auth/token") {
          return Response.json({ id_token: appleToken });
        }
        return Response.json({
          keys: [
            { ...applePublicJwk, kid: "apple-key", alg: "RS256", use: "sig" },
          ],
        });
      },
    );
    const appleConfig = loadConfig({
      DATABASE_URL:
        "postgresql://commuteshare:commuteshare@localhost/commuteshare",
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
      APPLE_OIDC_CLIENT_IDS: "ng.commuteshare.web",
      APPLE_TEAM_ID: "TEAMID1234",
      APPLE_KEY_ID: "KEYID12345",
      APPLE_PRIVATE_KEY: applePrivateKey,
      APPLE_REDIRECT_URI: "https://commuteshare.ng/auth/apple/callback",
    });
    const verifier = new JoseSocialIdentityVerifier(
      appleConfig,
      appleFetch as typeof fetch,
    );

    await expect(verifier.verify("apple", appleToken)).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      verifier.verify("apple", appleToken, "one-time-authorization-code"),
    ).resolves.toEqual({
      provider: "apple",
      subject: "apple-user-123",
      email: "apple-rider@example.com",
      displayName: null,
      nonce: "apple-social-nonce",
    });

    const tokenCall = appleFetch.mock.calls.find(([input]) =>
      String(input).includes("/auth/token"),
    );
    const body = tokenCall?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    const parameters = body as URLSearchParams;
    expect(parameters.get("client_id")).toBe("ng.commuteshare.web");
    expect(parameters.get("code")).toBe("one-time-authorization-code");
    expect(parameters.get("redirect_uri")).toBe(
      "https://commuteshare.ng/auth/apple/callback",
    );
    await expect(
      jwtVerify(
        parameters.get("client_secret") ?? "",
        appleClientKeys.publicKey,
        {
          issuer: "TEAMID1234",
          subject: "ng.commuteshare.web",
          audience: "https://appleid.apple.com",
          algorithms: ["ES256"],
        },
      ),
    ).resolves.toBeDefined();
  });
});
