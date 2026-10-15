import { createHmac } from "node:crypto";
import { loadConfig } from "@commuteshare/config";
import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PaymentService } from "./payment.service.js";
import { PaystackWebhookController } from "./paystack-webhook.controller.js";

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

describe("PaystackWebhookController", () => {
  it("accepts a signed event and delegates processing", async () => {
    const body = {
      event: "charge.success",
      data: { reference: "CS-reference" },
    };
    const rawBody = Buffer.from(JSON.stringify(body));
    const signature = createHmac("sha512", config.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");
    const payments = { handlePaystackWebhook: vi.fn() };
    const controller = new PaystackWebhookController(
      config,
      payments as unknown as PaymentService,
    );

    await expect(
      controller.handle({ rawBody } as never, signature, body),
    ).resolves.toEqual({ received: true });
    expect(payments.handlePaystackWebhook).toHaveBeenCalledWith(body);
  });

  it("rejects an invalid signature", async () => {
    const payments = { handlePaystackWebhook: vi.fn() };
    const controller = new PaystackWebhookController(
      config,
      payments as unknown as PaymentService,
    );

    await expect(
      controller.handle({ rawBody: Buffer.from("{}") } as never, "invalid", {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(payments.handlePaystackWebhook).not.toHaveBeenCalled();
  });
});
