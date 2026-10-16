import { describe, expect, it } from "vitest";
import {
  createSocialChallengeSchema,
  socialCredentialSchema,
} from "./auth.schemas.js";
import {
  createOtp,
  createRefreshSecret,
  digestSecret,
  hashPassword,
  secretsMatch,
  verifyPassword,
} from "./auth-crypto.js";

describe("auth crypto", () => {
  it("uses the configured development OTP", () => {
    expect(createOtp("123456")).toBe("123456");
  });

  it("creates six-digit production OTPs", () => {
    expect(createOtp()).toMatch(/^\d{6}$/);
  });

  it("compares secret digests safely", () => {
    const digest = digestSecret("a".repeat(32), "challenge:123456");

    expect(secretsMatch(digest, digest)).toBe(true);
    expect(secretsMatch(digest, digestSecret("a".repeat(32), "wrong"))).toBe(
      false,
    );
  });

  it("creates high-entropy refresh secrets", () => {
    expect(createRefreshSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hashes and securely verifies passwords", () => {
    const pwd = "SecurePassword123!";
    const hash = hashPassword(pwd);
    expect(hash).toContain(":");
    expect(verifyPassword(pwd, hash)).toBe(true);
    expect(verifyPassword("WrongPassword!", hash)).toBe(false);
    expect(verifyPassword(pwd, "")).toBe(false);
  });

  it("validates social challenges and bounded identity tokens", () => {
    expect(createSocialChallengeSchema.parse({ provider: "google" })).toEqual({
      provider: "google",
    });
    expect(
      socialCredentialSchema.safeParse({
        challengeId: "9f0403a1-5970-4ad5-83b1-f345ce34ed76",
        idToken: "x".repeat(100),
        authorizationCode: "one-time-code",
      }).success,
    ).toBe(true);
  });
});

