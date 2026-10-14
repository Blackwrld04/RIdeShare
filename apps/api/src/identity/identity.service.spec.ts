import { loadConfig } from "@commuteshare/config";
import { IdentityVerificationStatus } from "@commuteshare/database";
import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import { IdentityService } from "./identity.service.js";
import type { NinProvider, VerifyNinProviderResult } from "./nin-provider.js";

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  OTP_DEV_CODE: "000000",
  NINJA_CLIENT_KEY: "ninja-client-key",
  NINJA_CLIENT_SECRET: "ninja-client-secret",
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
  consent: true as const,
  consentVersion: "2026-10-01",
};

function fixture(
  providerResult: VerifyNinProviderResult = {
    found: true,
    verified: true,
    mismatches: [],
  },
) {
  let record: Record<string, unknown> | null = null;
  const userIdentityVerification = {
    findUnique: vi
      .fn()
      .mockImplementation(
        (query: { where: { userId?: string; ninLookupHash?: string } }) => {
          if (query.where.ninLookupHash) {
            return null;
          }
          return record;
        },
      ),
    upsert: vi.fn().mockImplementation((query: { create: object }) => {
      record = {
        ...query.create,
        status: IdentityVerificationStatus.PENDING,
        verifiedAt: null,
        updatedAt: new Date("2026-10-14T12:00:00.000Z"),
      };
      return record;
    }),
    updateMany: vi.fn().mockImplementation((query: { data: object }) => {
      record = { ...record, ...query.data, updatedAt: new Date() };
      return { count: 1 };
    }),
  };
  const database = {
    client: { userIdentityVerification },
  } as unknown as DatabaseService;
  const provider = {
    verify: vi.fn().mockResolvedValue(providerResult),
  } as unknown as NinProvider;

  return {
    service: new IdentityService(config, database, provider),
    provider,
    userIdentityVerification,
    getRecord: () => record,
  };
}

describe("IdentityService", () => {
  it("stores encrypted identity material and returns only a masked NIN", async () => {
    const { service, provider, userIdentityVerification } = fixture();

    await expect(service.verify("user-id", input)).resolves.toMatchObject({
      currentConsentVersion: "2026-10-01",
      verification: {
        status: IdentityVerificationStatus.VERIFIED,
        provider: "ninja",
        maskedNin: "*******7777",
      },
    });

    const create = userIdentityVerification.upsert.mock.calls[0]?.[0].create;
    expect(create.ninCiphertext).toBeInstanceOf(Uint8Array);
    expect(create.ninIv).toHaveLength(12);
    expect(create.ninAuthTag).toHaveLength(16);
    expect(create.ninLookupHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(create)).not.toContain(input.nin);
    expect(provider.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        nin: input.nin,
        reference: expect.any(String),
      }),
    );
  });

  it("records rejected identity details without exposing mismatches", async () => {
    const { service, getRecord } = fixture({
      found: true,
      verified: false,
      mismatches: ["first_name"],
    });

    await expect(service.verify("user-id", input)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(getRecord()).toMatchObject({
      status: IdentityVerificationStatus.FAILED,
      failureReason: "identity_details_mismatch",
    });
  });

  it("keeps an attempt pending when Ninja is unavailable", async () => {
    const { service, provider, getRecord } = fixture();
    vi.mocked(provider.verify).mockRejectedValue(new Error("network failure"));

    await expect(service.verify("user-id", input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(getRecord()).toMatchObject({
      status: IdentityVerificationStatus.PENDING,
      failureReason: "provider_unavailable",
    });
  });
});
