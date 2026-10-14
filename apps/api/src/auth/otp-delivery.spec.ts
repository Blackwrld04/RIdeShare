import { loadConfig } from "@commuteshare/config";
import { describe, expect, it, vi } from "vitest";
import { TermiiOtpDelivery } from "./otp-delivery.js";

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  SMS_PROVIDER: "termii",
  TERMII_API_KEY: "termii-key",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
});

describe("TermiiOtpDelivery", () => {
  it("sends a Nigerian SMS without the leading plus", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const delivery = new TermiiOtpDelivery(
      config,
      fetchImplementation as typeof fetch,
    );

    await delivery.send({
      phoneE164: "+2348031234567",
      code: "123456",
      expiresInSeconds: 300,
    });

    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body)) as Record<
      string,
      unknown
    >;

    expect(String(url)).toBe("https://api.ng.termii.com/api/sms/send");
    expect(payload).toMatchObject({
      api_key: "termii-key",
      to: "2348031234567",
      from: "CommuteNG",
      type: "plain",
      channel: "generic",
    });
  });
});
