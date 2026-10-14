import { describe, expect, it } from "vitest";
import {
  checksumBase64ToHex,
  hexChecksumToBase64,
  objectExtensionForContentType,
} from "./object-storage.js";

describe("object storage helpers", () => {
  it("converts SHA-256 checksums without losing bytes", () => {
    const checksum = "af".repeat(32);

    expect(checksumBase64ToHex(hexChecksumToBase64(checksum))).toBe(checksum);
  });

  it("uses controlled extensions from verified MIME types", () => {
    expect(objectExtensionForContentType("application/pdf")).toBe("pdf");
    expect(objectExtensionForContentType("image/jpeg")).toBe("jpg");
    expect(() => objectExtensionForContentType("text/html")).toThrow(
      "Unsupported upload content type",
    );
  });
});
