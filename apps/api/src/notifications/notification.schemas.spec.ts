import { describe, expect, it } from "vitest";
import { listNotificationsSchema } from "./notification.schemas.js";

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
});
