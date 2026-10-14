import { createHash, randomBytes } from "node:crypto";

export function createSafetyShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function digestSafetyShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
