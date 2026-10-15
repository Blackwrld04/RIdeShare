import { describe, expect, it } from "vitest";
import {
  classifyWebPushFailure,
  nextWebPushAttemptAt,
  webPushUrgency,
} from "./web-push.policy.js";

describe("web push policy", () => {
  it("classifies expired, retryable, and permanent responses", () => {
    expect(classifyWebPushFailure({ statusCode: 410 })).toMatchObject({
      kind: "expired",
    });
    expect(classifyWebPushFailure({ statusCode: 503 })).toMatchObject({
      kind: "retryable",
    });
    expect(classifyWebPushFailure({ statusCode: 400 })).toMatchObject({
      kind: "permanent",
    });
    expect(classifyWebPushFailure(new Error("network unavailable"))).toEqual({
      kind: "retryable",
      message: "network unavailable",
    });
  });

  it("uses bounded exponential retry delays", () => {
    const now = new Date("2026-10-15T03:00:00.000Z");
    expect(nextWebPushAttemptAt(now, 1).toISOString()).toBe(
      "2026-10-15T03:00:30.000Z",
    );
    expect(nextWebPushAttemptAt(now, 10).toISOString()).toBe(
      "2026-10-15T03:15:00.000Z",
    );
  });

  it("prioritizes SOS notifications", () => {
    expect(webPushUrgency("safety_sos")).toBe("high");
    expect(webPushUrgency("chat_message")).toBe("normal");
  });
});
