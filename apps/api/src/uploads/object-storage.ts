import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppConfig } from "@commuteshare/config";

export interface SignUploadInput {
  objectKey: string;
  contentType: string;
  checksumSha256: string;
  expiresInSeconds: number;
}

export interface SignedUpload {
  url: string;
  headers: Record<string, string>;
}

export interface StoredObject {
  contentType: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
}

export abstract class ObjectStorage {
  abstract signUpload(input: SignUploadInput): Promise<SignedUpload>;
  abstract inspect(objectKey: string): Promise<StoredObject | null>;
  abstract delete(objectKey: string): Promise<void>;
  abstract onApplicationShutdown(): void;
}

export class S3ObjectStorage extends ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfig) {
    super();
    this.client = new S3Client({
      region: config.STORAGE_REGION,
      ...(config.STORAGE_ENDPOINT ? { endpoint: config.STORAGE_ENDPOINT } : {}),
      credentials: {
        accessKeyId: config.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: config.STORAGE_SECRET_ACCESS_KEY,
      },
      forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
    });
  }

  async signUpload(input: SignUploadInput): Promise<SignedUpload> {
    const checksumBase64 = hexChecksumToBase64(input.checksumSha256);
    const command = new PutObjectCommand({
      Bucket: this.config.STORAGE_BUCKET,
      Key: input.objectKey,
      ContentType: input.contentType,
      ChecksumSHA256: checksumBase64,
      Metadata: { sha256: input.checksumSha256 },
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
      unhoistableHeaders: new Set([
        "x-amz-checksum-sha256",
        "x-amz-meta-sha256",
      ]),
    });

    return {
      url,
      headers: {
        "content-type": input.contentType,
        "x-amz-checksum-sha256": checksumBase64,
        "x-amz-meta-sha256": input.checksumSha256,
      },
    };
  }

  async inspect(objectKey: string): Promise<StoredObject | null> {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.STORAGE_BUCKET,
          Key: objectKey,
          ChecksumMode: "ENABLED",
        }),
      );

      return {
        contentType: object.ContentType ?? null,
        sizeBytes: object.ContentLength ?? null,
        checksumSha256: object.Metadata?.sha256
          ? object.Metadata.sha256.toLowerCase()
          : checksumBase64ToHex(object.ChecksumSHA256),
      };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.STORAGE_BUCKET,
        Key: objectKey,
      }),
    );
  }

  onApplicationShutdown(): void {
    this.client.destroy();
  }
}

export function hexChecksumToBase64(checksum: string): string {
  return Buffer.from(checksum, "hex").toString("base64");
}

export function checksumBase64ToHex(checksum?: string): string | null {
  return checksum ? Buffer.from(checksum, "base64").toString("hex") : null;
}

export function objectExtensionForContentType(contentType: string): string {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const extension = extensions[contentType];

  if (!extension) {
    throw new Error("Unsupported upload content type");
  }

  return extension;
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404
  );
}
