import { describe, expect, it } from "vitest";
import {
  inspectKycMedia,
  isKycContentTypeAllowed,
} from "./kyc-media.policy.js";

function png(width: number, height: number): Uint8Array {
  const bytes = Buffer.alloc(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

describe("KYC media policy", () => {
  it("requires images for photo document kinds", () => {
    expect(isKycContentTypeAllowed("profile_photo", "application/pdf")).toBe(
      false,
    );
    expect(isKycContentTypeAllowed("profile_photo", "image/jpeg")).toBe(true);
    expect(isKycContentTypeAllowed("driver_license", "application/pdf")).toBe(
      true,
    );
  });

  it("accepts a square profile photo with sufficient resolution", async () => {
    await expect(
      inspectKycMedia(png(800, 800), "profile_photo", "image/png"),
    ).resolves.toEqual({
      detectedContentType: "image/png",
      width: 800,
      height: 800,
      issues: [],
    });
  });

  it("rejects low-resolution and mismatched media", async () => {
    await expect(
      inspectKycMedia(png(320, 200), "profile_photo", "image/jpeg"),
    ).resolves.toMatchObject({
      detectedContentType: "image/png",
      issues: ["contentType", "profilePhotoDimensions"],
    });
  });

  it("accepts a genuine PDF for non-photo documents", async () => {
    await expect(
      inspectKycMedia(
        new TextEncoder().encode("%PDF-1.7\n1 0 obj\n"),
        "driver_license",
        "application/pdf",
      ),
    ).resolves.toEqual({
      detectedContentType: "application/pdf",
      width: null,
      height: null,
      issues: [],
    });
  });
});
