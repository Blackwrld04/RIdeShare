import { createCipheriv, createHmac, randomBytes } from "node:crypto";

export interface ProtectedNin {
  ciphertext: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  authTag: Uint8Array<ArrayBuffer>;
}

export function protectNin(nin: string, encodedKey: string): ProtectedNin {
  const key = Buffer.from(encodedKey, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(nin, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: Uint8Array.from(ciphertext),
    iv: Uint8Array.from(iv),
    authTag: Uint8Array.from(cipher.getAuthTag()),
  };
}

export function digestNin(nin: string, secret: string): string {
  return createHmac("sha256", secret).update(nin).digest("hex");
}
