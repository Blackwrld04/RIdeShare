import { describe, expect, it } from "vitest";
import {
  cancelBookingSchema,
  createBookingSchema,
  declineBookingSchema,
} from "./booking.schemas.js";

describe("booking schemas", () => {
  it("accepts a bounded seat request", () => {
    expect(
      createBookingSchema.parse({
        rideId: "b9cf2712-53a9-4a66-a6a6-92d319450138",
        seats: 2,
      }),
    ).toEqual({
      rideId: "b9cf2712-53a9-4a66-a6a6-92d319450138",
      seats: 2,
    });
  });

  it("rejects a request above the ride seat limit", () => {
    expect(
      createBookingSchema.safeParse({
        rideId: "b9cf2712-53a9-4a66-a6a6-92d319450138",
        seats: 8,
      }).success,
    ).toBe(false);
  });

  it("accepts a bounded corridor journey", () => {
    expect(
      createBookingSchema.parse({
        rideId: "b9cf2712-53a9-4a66-a6a6-92d319450138",
        seats: 1,
        journey: {
          pickupLatitude: 6.5095,
          pickupLongitude: 3.3711,
          dropoffLatitude: 6.4541,
          dropoffLongitude: 3.3947,
        },
      }).journey,
    ).toMatchObject({ corridorRadiusMeters: 5_000 });
  });

  it.each([declineBookingSchema, cancelBookingSchema])(
    "requires a meaningful release reason",
    (schema) => {
      expect(schema.safeParse({ reason: "no" }).success).toBe(false);
      expect(schema.safeParse({ reason: "Plans changed" }).success).toBe(true);
    },
  );
});
