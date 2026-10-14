import { describe, expect, it } from "vitest";
import {
  initializeCheckoutSchema,
  paystackWebhookSchema,
} from "./payment.schemas.js";

describe("payment schemas", () => {
  it("accepts a booking checkout request", () => {
    expect(
      initializeCheckoutSchema.parse({
        bookingId: "de362b08-aab9-4587-b195-443d14b4af44",
      }),
    ).toEqual({ bookingId: "de362b08-aab9-4587-b195-443d14b4af44" });
  });

  it("accepts additional Paystack event fields", () => {
    expect(
      paystackWebhookSchema.parse({
        event: "charge.success",
        data: { reference: "CS-reference", amount: 230_000 },
      }),
    ).toMatchObject({ event: "charge.success" });
  });

  it("accepts a transfer webhook in kobo", () => {
    expect(
      paystackWebhookSchema.parse({
        event: "transfer.success",
        data: {
          reference: "csp_1234567890123456",
          transfer_code: "TRF_testtransfer",
          amount: 200_000,
          currency: "NGN",
        },
      }),
    ).toMatchObject({ event: "transfer.success" });
  });
});
