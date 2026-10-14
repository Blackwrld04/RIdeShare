import { describe, expect, it } from "vitest";
import { createUploadSchema, uploadIdSchema } from "./upload.schemas.js";

describe("upload schemas", () => {
  it("normalizes checksum metadata", () => {
    const result = createUploadSchema.parse({
      purpose: "driver_document",
      contentType: "application/pdf",
      sizeBytes: 4096,
      checksumSha256: "A".repeat(64),
    });

    expect(result.checksumSha256).toBe("a".repeat(64));
  });

  it("rejects unsupported file types", () => {
    expect(
      createUploadSchema.safeParse({
        purpose: "driver_document",
        contentType: "text/html",
        sizeBytes: 4096,
        checksumSha256: "a".repeat(64),
      }).success,
    ).toBe(false);
  });

  it("validates upload identifiers", () => {
    expect(
      uploadIdSchema.safeParse("9f0403a1-5970-4ad5-83b1-f345ce34ed76").success,
    ).toBe(true);
    expect(uploadIdSchema.safeParse("upload-1").success).toBe(false);
  });
});
