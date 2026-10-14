import { createHmac, timingSafeEqual } from "node:crypto";

export function calculatePlatformFeeKobo(
  baseAmountKobo: bigint,
  basisPoints: number,
): bigint {
  return (baseAmountKobo * BigInt(basisPoints) + 9_999n) / 10_000n;
}

export function verifyPaystackSignature(
  rawBody: Buffer,
  signature: string,
  secretKey: string,
): boolean {
  const expected = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
