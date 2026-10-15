import { loadConfig } from "@commuteshare/config";
import { describe, expect, it, vi } from "vitest";
import { HttpPaystackClient } from "./paystack.client.js";

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

describe("HttpPaystackClient", () => {
  it("initializes a sandbox transaction from the backend", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.com/access-code",
          access_code: "access-code",
          reference: "CS-reference",
        },
      }),
    );
    const client = new HttpPaystackClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(
      client.initialize({
        email: "rider@example.com",
        amountKobo: 230_000,
        currency: "NGN",
        reference: "CS-reference",
        callbackUrl: "http://localhost:3000/payments/callback",
        metadata: { bookingId: "booking-id" },
      }),
    ).resolves.toEqual({
      authorizationUrl: "https://checkout.paystack.com/access-code",
      accessCode: "access-code",
      reference: "CS-reference",
    });

    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(String(url)).toBe("https://api.paystack.co/transaction/initialize");
    expect(request?.headers).toMatchObject({
      authorization: "Bearer sk_test_commuteshare_local",
    });
    expect(body).toMatchObject({ amount: "230000", currency: "NGN" });
  });

  it("verifies a successful transaction", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        message: "Verification successful",
        data: {
          id: 4_099_260_516,
          status: "success",
          reference: "CS-reference",
          amount: 230_000,
          currency: "NGN",
          paid_at: "2026-10-14T17:00:00.000Z",
        },
      }),
    );
    const client = new HttpPaystackClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(client.verify("CS-reference")).resolves.toMatchObject({
      id: "4099260516",
      status: "success",
      amountKobo: 230_000,
      currency: "NGN",
    });
  });

  it("queues a partial refund in kobo", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        message: "Refund has been queued for processing",
        data: {
          id: 3_018_284,
          status: "pending",
          amount: 130_000,
          currency: "NGN",
        },
      }),
    );
    const client = new HttpPaystackClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(
      client.createRefund({
        transactionReference: "CS-reference",
        amountKobo: 130_000,
        currency: "NGN",
        reason: "Passenger cancelled within 24 hours",
      }),
    ).resolves.toMatchObject({
      id: "3018284",
      status: "pending",
      amountKobo: 130_000,
    });

    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.paystack.co/refund");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      transaction: "CS-reference",
      amount: 130_000,
    });
  });

  it("lists active Nigerian banks", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        data: [
          { name: "GTBank", code: "058", currency: "NGN", active: true },
          { name: "Old Bank", code: "999", currency: "NGN", active: false },
        ],
      }),
    );
    const client = new HttpPaystackClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(client.listBanks()).resolves.toEqual([
      { name: "GTBank", code: "058", currency: "NGN" },
    ]);
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "/bank?country=nigeria&currency=NGN",
    );
  });

  it("resolves a NUBAN account", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        data: {
          account_number: "0123456789",
          account_name: "OLAJIDE ABDULQUADRI",
        },
      }),
    );
    const client = new HttpPaystackClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(client.resolveAccount("0123456789", "058")).resolves.toEqual({
      accountNumber: "0123456789",
      accountName: "OLAJIDE ABDULQUADRI",
    });
  });

  it("creates a sandbox transfer recipient", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        data: {
          recipient_code: "RCP_testrecipient",
          name: "OLAJIDE ABDULQUADRI",
          details: {
            account_number: "0123456789",
            account_name: "OLAJIDE ABDULQUADRI",
            bank_code: "058",
            bank_name: "GTBank",
          },
        },
      }),
    );
    const client = new HttpPaystackClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(
      client.createTransferRecipient({
        name: "OLAJIDE ABDULQUADRI",
        accountNumber: "0123456789",
        bankCode: "058",
        currency: "NGN",
        description: "CommuteShare driver payout",
      }),
    ).resolves.toMatchObject({
      recipientCode: "RCP_testrecipient",
      bankCode: "058",
      bankName: "GTBank",
    });
  });
});
