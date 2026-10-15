import { describe, expect, it } from "vitest";
import {
  listAdminApplicationsSchema,
  reviewDecisionSchema,
} from "./admin.schemas.js";

describe("admin schemas", () => {
  it("parses queue filters and bounded page sizes", () => {
    expect(
      listAdminApplicationsSchema.parse({
        status: "SUBMITTED",
        limit: "25",
      }),
    ).toEqual({ status: "SUBMITTED", limit: 25 });
    expect(() => listAdminApplicationsSchema.parse({ limit: "101" })).toThrow();
  });

  it("requires a reason for rejection decisions", () => {
    expect(reviewDecisionSchema.parse({ decision: "approve" })).toEqual({
      decision: "approve",
    });
    expect(() => reviewDecisionSchema.parse({ decision: "reject" })).toThrow();
    expect(
      reviewDecisionSchema.parse({
        decision: "reject",
        reason: "Document is unreadable",
      }),
    ).toMatchObject({ decision: "reject" });
  });
});
