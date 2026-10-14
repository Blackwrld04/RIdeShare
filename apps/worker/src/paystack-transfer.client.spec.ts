import { loadConfig } from "@commuteshare/config";
import { describe, expect, it, vi } from "vitest";
import { PaystackTransferClient } from "./paystack-transfer.client.js";

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  OTP_DEV_CODE: "000000",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
});

describe("PaystackTransferClient", () => {
  it("initiates a transfer with a stable payout reference", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        message: "Transfer has been queued",
        data: {
          amount: 200_000,
          currency: "NGN",
          reference: "csp_1234567890123456",
          status: "pending",
          transfer_code: "TRF_testtransfer",
        },
      }),
    );
    const client = new PaystackTransferClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(
      client.initiate({
        amountKobo: 200_000,
        currency: "NGN",
        recipientCode: "RCP_testrecipient",
        reference: "csp_1234567890123456",
        reason: "CommuteShare ride payout",
      }),
    ).resolves.toMatchObject({
      amountKobo: 200_000,
      status: "pending",
      transferCode: "TRF_testtransfer",
    });

    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.paystack.co/transfer");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      source: "balance",
      amount: 200_000,
      recipient: "RCP_testrecipient",
    });
  });

  it("verifies an uncertain transfer by reference", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      Response.json({
        status: true,
        message: "Transfer retrieved",
        data: {
          amount: 200_000,
          currency: "NGN",
          reference: "csp_1234567890123456",
          status: "success",
          transfer_code: "TRF_testtransfer",
        },
      }),
    );
    const client = new PaystackTransferClient(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(client.verify("csp_1234567890123456")).resolves.toMatchObject({
      status: "success",
    });
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "/transfer/verify/csp_1234567890123456",
    );
  });
});
