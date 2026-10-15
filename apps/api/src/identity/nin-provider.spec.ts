import { loadConfig } from "@commuteshare/config";
import { describe, expect, it, vi } from "vitest";
import { HttpNinjaNinProvider } from "./nin-provider.js";

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

const input = {
  nin: "77777777777",
  legalFirstName: "James",
  legalLastName: "Bond",
  dateOfBirth: "1975-01-01",
  reference: "nin-request-reference",
};

describe("HttpNinjaNinProvider", () => {
  it("authenticates and verifies identity against the Ninja sandbox", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          token: "session-token",
          expiry: "2099-01-01T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "77777777777",
          found: true,
          verified: true,
          mismatches: [],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "77777777777",
          found: true,
          verified: true,
          mismatches: [],
        }),
      );
    const provider = new HttpNinjaNinProvider(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(provider.verify(input)).resolves.toEqual({
      found: true,
      verified: true,
      mismatches: [],
    });
    await provider.verify(input);

    expect(fetchImplementation).toHaveBeenCalledTimes(3);
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toBe(
      "https://api.sandbox.ninja.boucloud.io/auth/session",
    );
    expect(String(fetchImplementation.mock.calls[1]?.[0])).toBe(
      "https://api.sandbox.ninja.boucloud.io/api/identity/identify",
    );
    expect(fetchImplementation.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        authorization: "Bearer session-token",
        "content-type": "application/json",
      },
    });
    expect(
      JSON.parse(String(fetchImplementation.mock.calls[1]?.[1]?.body)),
    ).toEqual({
      idType: "nin",
      mode: "verify",
      idNumber: "77777777777",
      firstName: "James",
      lastName: "Bond",
      dateOfBirth: "1975-01-01",
      reference: "nin-request-reference",
    });
  });

  it("maps a sandbox miss without exposing a registry record", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          token: "session-token",
          expiry: "2099-01-01T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ status: "not_found", data: null }),
      );
    const provider = new HttpNinjaNinProvider(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(
      provider.verify({ ...input, nin: "55555555555" }),
    ).resolves.toEqual({ found: false, verified: false, mismatches: [] });
  });
});
