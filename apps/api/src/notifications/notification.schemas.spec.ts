import { describe, expect, it } from "vitest";
import {
  listNotificationsSchema,
  registerWebPushSubscriptionSchema,
} from "./notification.schemas.js";

describe("notification schemas", () => {
  it("coerces bounded list filters", () => {
    expect(
      listNotificationsSchema.parse({ unreadOnly: "true", limit: "20" }),
    ).toEqual({ unreadOnly: true, limit: 20 });
  });

  it("rejects ambiguous boolean filters", () => {
    expect(
      listNotificationsSchema.safeParse({ unreadOnly: "yes" }).success,
    ).toBe(false);
  });

  it("accepts browser push subscription payloads", () => {
    expect(
      registerWebPushSubscriptionSchema.parse({
        endpoint: "https://push.example/subscription",
        expirationTime: null,
        keys: {
          p256dh: "a".repeat(87),
          auth: "b".repeat(22),
        },
      }),
    ).toMatchObject({ endpoint: "https://push.example/subscription" });
    expect(() =>
      registerWebPushSubscriptionSchema.parse({
        endpoint: "http://push.example/subscription",
        keys: { p256dh: "a".repeat(87), auth: "short" },
      }),
    ).toThrow();
  });
});
