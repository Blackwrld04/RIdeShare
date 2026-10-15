import { describe, expect, it } from "vitest";
import {
  createReportSchema,
  listAdminReportsSchema,
  reviewReportSchema,
} from "./report.schemas.js";

describe("report schemas", () => {
  it("validates report categories and meaningful details", () => {
    expect(
      createReportSchema.parse({
        category: "SAFETY",
        details: "  The driver ignored traffic lights  ",
      }),
    ).toEqual({
      category: "SAFETY",
      details: "The driver ignored traffic lights",
    });
    expect(
      createReportSchema.safeParse({ category: "SPAM", details: "Too short" })
        .success,
    ).toBe(false);
  });

  it("requires notes for terminal review decisions", () => {
    expect(reviewReportSchema.safeParse({ status: "RESOLVED" }).success).toBe(
      false,
    );
    expect(
      reviewReportSchema.parse({
        status: "DISMISSED",
        note: "The submitted details could not be verified",
      }).status,
    ).toBe("DISMISSED");
  });

  it("coerces admin queue filters", () => {
    expect(
      listAdminReportsSchema.parse({
        status: "OPEN",
        category: "FRAUD",
        limit: "10",
      }),
    ).toEqual({ status: "OPEN", category: "FRAUD", limit: 10 });
  });
});
