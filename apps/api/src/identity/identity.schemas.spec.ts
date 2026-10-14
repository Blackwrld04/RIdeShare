import { describe, expect, it } from "vitest";
import { verifyNinSchema } from "./identity.schemas.js";

describe("identity schemas", () => {
  it("accepts an explicit consented NIN verification", () => {
    expect(
      verifyNinSchema.parse({
        nin: "77777777777",
        legalFirstName: " James ",
        legalLastName: "Bond",
        dateOfBirth: "1975-01-01",
        consent: true,
        consentVersion: "2026-10-01",
      }),
    ).toEqual({
      nin: "77777777777",
      legalFirstName: "James",
      legalLastName: "Bond",
      dateOfBirth: "1975-01-01",
      consent: true,
      consentVersion: "2026-10-01",
    });
  });

  it.each([
    { nin: "1234567890", consent: true },
    { nin: "123456789012", consent: true },
    { nin: "1234567890x", consent: true },
    { nin: "77777777777", consent: false },
  ])("rejects invalid NIN verification input", (override) => {
    const candidate = Object.assign(
      {
        nin: "77777777777",
        legalFirstName: "James",
        legalLastName: "Bond",
        dateOfBirth: "1975-01-01",
        consent: true,
        consentVersion: "2026-10-01",
      },
      override,
    );

    expect(verifyNinSchema.safeParse(candidate).success).toBe(false);
  });
});
