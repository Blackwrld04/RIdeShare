import { describe, expect, it } from "vitest";
import { resolveBankAccountSchema } from "./bank.schemas.js";

describe("bank schemas", () => {
  it("accepts a Nigerian NUBAN and numeric bank code", () => {
    expect(
      resolveBankAccountSchema.parse({
        accountNumber: "0123456789",
        bankCode: "058",
      }),
    ).toEqual({ accountNumber: "0123456789", bankCode: "058" });
  });

  it.each(["123456789", "12345678901", "12345abcde"])(
    "rejects invalid NUBAN %s",
    (accountNumber) => {
      expect(() =>
        resolveBankAccountSchema.parse({ accountNumber, bankCode: "058" }),
      ).toThrow();
    },
  );
});
