import { describe, expect, it } from "vitest";
import { normalizeNigerianPhone } from "./phone-number.js";

describe("normalizeNigerianPhone", () => {
  it.each([
    ["0803 123 4567", "+2348031234567"],
    ["+234 803 123 4567", "+2348031234567"],
    ["2348031234567", "+2348031234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeNigerianPhone(input)).toBe(expected);
  });

  it("rejects non-Nigerian numbers", () => {
    expect(() => normalizeNigerianPhone("+447911123456")).toThrow(
      "valid Nigerian mobile number",
    );
  });
});
