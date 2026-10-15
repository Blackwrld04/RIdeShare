import { describe, expect, it } from "vitest";
import { createReviewSchema, listReviewsSchema } from "./review.schemas.js";

describe("review schemas", () => {
  it("accepts bounded ratings and trims comments", () => {
    expect(
      createReviewSchema.parse({ rating: 5, comment: "  Great rider  " }),
    ).toEqual({ rating: 5, comment: "Great rider" });
    expect(createReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("coerces bounded page limits", () => {
    expect(listReviewsSchema.parse({ limit: "10" }).limit).toBe(10);
    expect(listReviewsSchema.safeParse({ limit: "51" }).success).toBe(false);
  });
});
