import { describe, expect, it } from "vitest";
import { tripTrackerQuerySchema } from "./trip.schemas.js";

describe("trip schemas", () => {
  it("defaults the tracker to upcoming trips", () => {
    expect(tripTrackerQuerySchema.parse({})).toEqual({ view: "upcoming" });
  });

  it.each(["upcoming", "past", "cancelled"])(
    "accepts the %s tracker view",
    (view) => {
      expect(tripTrackerQuerySchema.parse({ view })).toEqual({ view });
    },
  );

  it("rejects unknown tracker views", () => {
    expect(tripTrackerQuerySchema.safeParse({ view: "draft" }).success).toBe(
      false,
    );
  });
});
