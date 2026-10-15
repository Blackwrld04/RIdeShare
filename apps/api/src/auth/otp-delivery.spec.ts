import { loadConfig } from "@commuteshare/config";
import { describe, expect, it, vi } from "vitest";
import {
  AfricasTalkingOtpDelivery,
  FallbackOtpDelivery,
  type OtpDelivery,
  TermiiOtpDelivery,
} from "./otp-delivery.js";

const environment = {
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  NINJA_PUBLIC_KEY: "ninja-public-key",
  NINJA_SECRET_KEY: "ninja-secret-key",
  IDENTITY_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  IDENTITY_HMAC_SECRET: "identity-hmac-secret-change-me-0001",
  SMS_PROVIDER: "termii",
  TERMII_API_KEY: "termii-key",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
};

const config = loadConfig(environment);

describe("TermiiOtpDelivery", () => {
  it("sends a Nigerian SMS without the leading plus", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const delivery = new TermiiOtpDelivery(
      config,
      fetchImplementation as typeof fetch,
    );

    await expect(
      delivery.send({
        phoneE164: "+2348031234567",
        code: "123456",
        expiresInSeconds: 300,
      }),
    ).resolves.toBe("termii");

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

describe("AfricasTalkingOtpDelivery", () => {
  it("sends an international Nigerian number through the messaging API", async () => {
    const africaConfig = loadConfig({
      ...environment,
      SMS_PROVIDER: "africastalking",
      TERMII_API_KEY: undefined,
      AFRICASTALKING_BASE_URL: "https://api.sandbox.africastalking.com",
      AFRICASTALKING_USERNAME: "sandbox",
      AFRICASTALKING_API_KEY: "sandbox-key",
      AFRICASTALKING_SENDER_ID: "CommuteNG",
    });
    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    const delivery = new AfricasTalkingOtpDelivery(
      africaConfig,
      fetchImplementation as typeof fetch,
    );

    await expect(
      delivery.send({
        phoneE164: "+2348031234567",
        code: "654321",
        expiresInSeconds: 300,
      }),
    ).resolves.toBe("africastalking");

    const [url, request] = fetchImplementation.mock.calls[0] ?? [];
    const body = new URLSearchParams(String(request?.body));
    expect(String(url)).toBe(
      "https://api.sandbox.africastalking.com/version1/messaging",
    );
    expect(request?.headers).toMatchObject({ apiKey: "sandbox-key" });
    expect(Object.fromEntries(body)).toMatchObject({
      username: "sandbox",
      to: "+2348031234567",
      from: "CommuteNG",
    });
  });
});

describe("FallbackOtpDelivery", () => {
  it("uses the secondary provider once when the primary fails", async () => {
    const primary = {
      send: vi.fn().mockRejectedValue(new Error("primary unavailable")),
    } as unknown as OtpDelivery;
    const fallback = {
      send: vi.fn().mockResolvedValue("africastalking"),
    } as unknown as OtpDelivery;
    const delivery = new FallbackOtpDelivery(primary, fallback);
    const message = {
      phoneE164: "+2348031234567",
      code: "654321",
      expiresInSeconds: 300,
    };

    await expect(delivery.send(message)).resolves.toBe("africastalking");
    expect(primary.send).toHaveBeenCalledOnce();
    expect(fallback.send).toHaveBeenCalledOnce();
  });
});
