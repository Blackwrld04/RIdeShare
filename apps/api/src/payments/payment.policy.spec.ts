import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  calculatePlatformFeeKobo,
  verifyPaystackSignature,
} from "./payment.policy.js";

describe("payment policy", () => {
  it("calculates the platform fee in whole kobo", () => {
    expect(calculatePlatformFeeKobo(200_000n, 1_500)).toBe(30_000n);
    expect(calculatePlatformFeeKobo(101n, 1_500)).toBe(16n);
  });

  it("verifies a Paystack webhook signature", () => {
    const body = Buffer.from('{"event":"charge.success"}');
    const secret = "sk_test_commuteshare_local";
    const signature = createHmac("sha512", secret).update(body).digest("hex");

    expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
    expect(verifyPaystackSignature(body, "00", secret)).toBe(false);
  });
});
