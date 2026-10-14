import { describe, expect, it } from "vitest";
import {
  createSafetyShareToken,
  digestSafetyShareToken,
} from "./safety-token.js";

describe("safety share tokens", () => {
  it("creates high entropy tokens and stable non-reversible digests", () => {
    const first = createSafetyShareToken();
    const second = createSafetyShareToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(digestSafetyShareToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(digestSafetyShareToken(first)).toBe(digestSafetyShareToken(first));
  });
});
