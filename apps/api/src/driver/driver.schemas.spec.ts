import { describe, expect, it } from "vitest";
import {
  driverDocumentKindSchema,
  updateDriverDetailsSchema,
  upsertDriverDocumentSchema,
  upsertDriverVehicleSchema,
} from "./driver.schemas.js";

describe("driver schemas", () => {
  it("normalizes vehicle registration numbers", () => {
    const result = upsertDriverVehicleSchema.parse({
      make: "Toyota",
      model: "Corolla",
      color: "Silver",
      year: 2022,
      registrationNumber: "lag 123 ab",
      seatCapacity: 5,
    });

    expect(result.registrationNumber).toBe("LAG123AB");
  });

  it("requires at least one detail in a patch", () => {
    expect(updateDriverDetailsSchema.safeParse({}).success).toBe(false);
  });

  it("normalizes extensible document kinds", () => {
    expect(driverDocumentKindSchema.parse(" Driver_License ")).toBe(
      "driver_license",
    );
  });

  it("rejects invalid document metadata", () => {
    const result = upsertDriverDocumentSchema.safeParse({
      storageKey: "drivers/../another-user/file.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
      checksumSha256: "a".repeat(64),
      issuedOn: "2026-10-14",
      expiresOn: "2026-10-13",
    });

    expect(result.success).toBe(false);
  });
});
