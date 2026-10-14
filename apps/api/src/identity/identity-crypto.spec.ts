import { createDecipheriv } from "node:crypto";
import { describe, expect, it } from "vitest";
import { digestNin, protectNin } from "./identity-crypto.js";

const encodedKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

describe("identity crypto", () => {
  it("protects NIN values with authenticated encryption", () => {
    const first = protectNin("77777777777", encodedKey);
    const second = protectNin("77777777777", encodedKey);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(encodedKey, "base64"),
      first.iv,
    );
    decipher.setAuthTag(first.authTag);
    const plaintext = Buffer.concat([
      decipher.update(first.ciphertext),
      decipher.final(),
    ]).toString("utf8");

    expect(plaintext).toBe("77777777777");
    expect(first.iv).toHaveLength(12);
    expect(first.authTag).toHaveLength(16);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
  });

  it("creates stable keyed lookup hashes", () => {
    const secret = "identity-hmac-secret-change-me-0001";

    expect(digestNin("77777777777", secret)).toBe(
      digestNin("77777777777", secret),
    );
    expect(digestNin("77777777777", secret)).not.toBe(
      digestNin("55555555555", secret),
    );
  });
});
