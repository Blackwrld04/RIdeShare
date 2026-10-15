import { loadConfig } from "@commuteshare/config";
import { describe, expect, it } from "vitest";
import { TokenService } from "./token.service.js";

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

describe("TokenService", () => {
  const tokens = new TokenService(config);

  it("signs and verifies access identities", async () => {
    const identity = {
      userId: "b9f140ac-619c-478a-9a32-902c687477f8",
      sessionId: "1b3e51e6-2404-483a-bc3b-31fd283c12aa",
    };
    const token = await tokens.createAccessToken(identity);

    await expect(tokens.verifyAccessToken(token)).resolves.toEqual(identity);
  });

  it("creates parseable refresh credentials", () => {
    const sessionId = "1b3e51e6-2404-483a-bc3b-31fd283c12aa";
    const refresh = tokens.createRefreshToken(sessionId);
    const parsed = tokens.parseRefreshToken(refresh.token);

    expect(parsed.sessionId).toBe(sessionId);
    expect(tokens.refreshSecretMatches(refresh.digest, parsed.secret)).toBe(
      true,
    );
  });

  it("rejects malformed refresh credentials", () => {
    expect(() => tokens.parseRefreshToken("not-a-refresh-token")).toThrow(
      "Invalid refresh token",
    );
  });
});
