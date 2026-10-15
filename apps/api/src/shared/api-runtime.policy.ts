import { randomUUID } from "node:crypto";

const requestIdPattern = /^[A-Za-z0-9._:-]{1,64}$/;
const rateLimitExemptPaths = new Set([
  "/api/v1/health",
  "/api/v1/ready",
  "/api/v1/payments/webhooks/paystack",
]);

export function resolveRequestId(
  header: string | string[] | undefined,
): string {
  return typeof header === "string" && requestIdPattern.test(header)
    ? header
    : randomUUID();
}

export function isRateLimitExemptPath(url: string): boolean {
  return rateLimitExemptPaths.has(url.split("?", 1)[0] ?? url);
}
