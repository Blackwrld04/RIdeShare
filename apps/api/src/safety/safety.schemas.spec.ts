import { describe, expect, it } from "vitest";
import {
  createEmergencyContactSchema,
  createShareLinkSchema,
  locationPingSchema,
} from "./safety.schemas.js";

describe("safety schemas", () => {
  it("applies safe contact and share defaults", () => {
    expect(
      createEmergencyContactSchema.parse({
        name: "  Ada  ",
        phone: "08012345678",
      }),
    ).toEqual({ name: "Ada", phone: "08012345678", isPrimary: false });
    expect(createShareLinkSchema.parse({})).toEqual({ expiresInHours: 24 });
  });

  it("rejects invalid live location readings", () => {
    expect(
      locationPingSchema.safeParse({
        latitude: 96,
        longitude: 3.4,
        headingDegrees: 400,
      }).success,
    ).toBe(false);
  });
});
