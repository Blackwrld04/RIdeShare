import { fileTypeFromBuffer } from "file-type";
import { imageSize } from "image-size";

const photoKinds = new Set(["profile_photo", "vehicle_photo"]);
const supportedContentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export interface KycMediaInspection {
  detectedContentType: string | null;
  width: number | null;
  height: number | null;
  issues: string[];
}

export function isKycContentTypeAllowed(
  documentKind: string,
  contentType: string,
): boolean {
  return (
    supportedContentTypes.has(contentType) &&
    (!photoKinds.has(documentKind) || contentType.startsWith("image/"))
  );
}

export async function inspectKycMedia(
  bytes: Uint8Array,
  documentKind: string,
  declaredContentType: string,
): Promise<KycMediaInspection> {
  const detected = await fileTypeFromBuffer(bytes);
  const detectedContentType = detected?.mime ?? null;
  const issues: string[] = [];

  if (!detectedContentType || !supportedContentTypes.has(detectedContentType)) {
    issues.push("fileType");
  } else if (detectedContentType !== declaredContentType) {
    issues.push("contentType");
  }

  if (!detectedContentType?.startsWith("image/")) {
    return { detectedContentType, width: null, height: null, issues };
  }

  let dimensions: ReturnType<typeof imageSize>;
  try {
    dimensions = imageSize(bytes);
  } catch {
    return {
      detectedContentType,
      width: null,
      height: null,
      issues: [...issues, "dimensions"],
    };
  }

  const width = dimensions.width;
  const height = dimensions.height;
  if (!width || !height || width * height > 40_000_000) {
    issues.push("dimensions");
  } else if (documentKind === "profile_photo") {
    const ratio = width / height;
    if (width < 480 || height < 480 || ratio < 0.75 || ratio > 1.33) {
      issues.push("profilePhotoDimensions");
    }
  } else if (documentKind === "vehicle_photo") {
    if (width < 800 || height < 450) {
      issues.push("vehiclePhotoDimensions");
    }
  } else if (Math.max(width, height) < 800 || Math.min(width, height) < 600) {
    issues.push("documentDimensions");
  }

  return {
    detectedContentType,
    width: width ?? null,
    height: height ?? null,
    issues,
  };
}
