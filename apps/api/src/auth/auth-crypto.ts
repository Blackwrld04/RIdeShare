import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export function createOtp(developmentCode?: string): string {
  return developmentCode ?? randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function digestSecret(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function secretsMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function createRefreshSecret(): string {
  return randomBytes(32).toString("base64url");
}
