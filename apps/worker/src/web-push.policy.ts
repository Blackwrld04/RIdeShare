export type WebPushFailureKind = "expired" | "retryable" | "permanent";

export interface WebPushFailure {
  kind: WebPushFailureKind;
  message: string;
}

export function classifyWebPushFailure(error: unknown): WebPushFailure {
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number(error.statusCode)
      : null;
  const message =
    error instanceof Error ? error.message.slice(0, 500) : "Web push failed";

  if (statusCode === 404 || statusCode === 410) {
    return { kind: "expired", message };
  }
  if (
    statusCode === null ||
    statusCode === 408 ||
    statusCode === 425 ||
    statusCode === 429 ||
    statusCode >= 500
  ) {
    return { kind: "retryable", message };
  }
  return { kind: "permanent", message };
}

export function nextWebPushAttemptAt(now: Date, attemptCount: number): Date {
  const delaySeconds = Math.min(900, 30 * 2 ** Math.max(0, attemptCount - 1));
  return new Date(now.getTime() + delaySeconds * 1_000);
}

export function webPushUrgency(kind: string): "normal" | "high" {
  return kind === "safety_sos" ? "high" : "normal";
}
