import { describe, expect, it } from "vitest";
import { doesAccountNameMatch } from "./bank.policy.js";

describe("bank account name policy", () => {
  it("matches reordered legal names with additional middle names", () => {
    expect(
      doesAccountNameMatch(
        "Olajide",
        "Abdulquadri",
        "ABDULQUADRI MUSA OLAJIDE",
      ),
    ).toBe(true);
  });

  it("normalizes punctuation and accents", () => {
    expect(
      doesAccountNameMatch("Damilola-Jane", "Adeyemi", "ADEYEMI DAMILOLA JANE"),
    ).toBe(true);
  });

  it("rejects an account missing either legal name", () => {
    expect(doesAccountNameMatch("Olajide", "Abdulquadri", "OLAJIDE MUSA")).toBe(
      false,
    );
  });
});
