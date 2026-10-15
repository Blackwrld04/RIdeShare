import { describe, expect, it } from "vitest";
import {
  createDisputeSchema,
  listDisputesSchema,
  resolveDisputeSchema,
} from "./dispute.schemas.js";

describe("payment dispute schemas", () => {
  it("accepts complete dispute requests", () => {
    expect(
      createDisputeSchema.parse({
        reason: "The agreed destination was not reached during this ride",
      }),
    ).toEqual({
      reason: "The agreed destination was not reached during this ride",
    });
    expect(listDisputesSchema.parse({})).toEqual({ limit: 20 });
  });

  it("requires an auditable resolution note", () => {
    expect(
      resolveDisputeSchema.safeParse({ action: "refund", note: "Too short" })
        .success,
    ).toBe(false);
    expect(
      resolveDisputeSchema.safeParse({
        action: "release",
        note: "Evidence confirms the ride was completed as agreed",
      }).success,
    ).toBe(true);
  });
});
