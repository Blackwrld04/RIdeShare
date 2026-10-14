import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "./profile.schemas.js";

describe("profile schemas", () => {
  it("normalizes a billing email", () => {
    expect(
      updateProfileSchema.parse({ billingEmail: " Rider@Example.COM " }),
    ).toEqual({ billingEmail: "rider@example.com" });
  });

  it("allows a billing email to be removed", () => {
    expect(updateProfileSchema.parse({ billingEmail: null })).toEqual({
      billingEmail: null,
    });
  });

  it("rejects an invalid billing email", () => {
    expect(
      updateProfileSchema.safeParse({ billingEmail: "not-an-email" }).success,
    ).toBe(false);
  });
});
