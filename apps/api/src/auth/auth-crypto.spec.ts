import { describe, expect, it } from "vitest";
import {
  createOtp,
  createRefreshSecret,
  digestSecret,
  secretsMatch,
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
});
