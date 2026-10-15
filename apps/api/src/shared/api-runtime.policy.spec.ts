import { describe, expect, it } from "vitest";
import {
  isRateLimitExemptPath,
  resolveRequestId,
} from "./api-runtime.policy.js";

describe("API runtime policy", () => {
  it("accepts bounded request IDs and replaces unsafe values", () => {
    expect(resolveRequestId("mobile-req:123")).toBe("mobile-req:123");
    expect(resolveRequestId("bad request id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/,
    );
    expect(resolveRequestId(["one", "two"])).not.toBe("one");
  });

  it("exempts probes and verified provider webhooks from global limits", () => {
    expect(isRateLimitExemptPath("/api/v1/health")).toBe(true);
    expect(
      isRateLimitExemptPath("/api/v1/payments/webhooks/paystack?source=retry"),
    ).toBe(true);
    expect(isRateLimitExemptPath("/api/v1/rides/search")).toBe(false);
  });
});
