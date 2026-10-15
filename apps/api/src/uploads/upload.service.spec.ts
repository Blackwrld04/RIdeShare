import { loadConfig } from "@commuteshare/config";
import { UploadStatus } from "@commuteshare/database";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import type { ObjectStorage } from "./object-storage.js";
import { UploadService } from "./upload.service.js";

const config = loadConfig({
  DATABASE_URL: "postgresql://commuteshare:commuteshare@localhost/commuteshare",
  REDIS_URL: "redis://localhost:6379",
  AUTH_ACCESS_TOKEN_SECRET: "a".repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: "b".repeat(32),
  OTP_HMAC_SECRET: "c".repeat(32),
  OTP_DEV_CODE: "000000",
  NINJA_PUBLIC_KEY: "ninja-public-key",
  NINJA_SECRET_KEY: "ninja-secret-key",
  IDENTITY_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  IDENTITY_HMAC_SECRET: "identity-hmac-secret-change-me-0001",
  PAYSTACK_SECRET_KEY: "sk_test_commuteshare_local",
  STORAGE_BUCKET: "commuteshare-private",
  STORAGE_ACCESS_KEY_ID: "commuteshare",
  STORAGE_SECRET_ACCESS_KEY: "commuteshare-local-secret",
});

const userId = "9f0403a1-5970-4ad5-83b1-f345ce34ed76";
const uploadId = "a1b916d6-ecdb-4caa-8daf-a1ad91f21e2e";
const checksumSha256 = "a".repeat(64);

function uploadAsset() {
  const now = new Date();

  return {
    id: uploadId,
    ownerUserId: userId,
    purpose: "driver_document",
    objectKey: `users/${userId}/driver_document/${uploadId}.pdf`,
    contentType: "application/pdf",
    sizeBytes: 4096n,
    checksumSha256,
    status: UploadStatus.PENDING,
    uploadExpiresAt: new Date(now.getTime() + 60_000),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function setup() {
  const asset = uploadAsset();
  const uploadAssetClient = {
    create: vi.fn().mockImplementation(({ data }) => ({ ...asset, ...data })),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    findFirst: vi.fn().mockResolvedValue(asset),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const database = {
    client: { uploadAsset: uploadAssetClient },
  } as unknown as DatabaseService;
  const storage = {
    signUpload: vi.fn().mockResolvedValue({
      url: "https://storage.example/upload",
      headers: { "content-type": "application/pdf" },
    }),
    signDownload: vi.fn().mockResolvedValue({
      url: "https://storage.example/download",
    }),
    inspect: vi.fn().mockResolvedValue({
      contentType: asset.contentType,
      sizeBytes: Number(asset.sizeBytes),
      checksumSha256: asset.checksumSha256,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    onApplicationShutdown: vi.fn(),
  } as unknown as ObjectStorage;

  return {
    asset,
    uploadAssetClient,
    storage,
    service: new UploadService(config, database, storage),
  };
}

describe("UploadService", () => {
  it("creates a private signed upload without exposing its object key", async () => {
    const { service, storage } = setup();
    const response = await service.create(userId, {
      purpose: "driver_document",
      contentType: "application/pdf",
      sizeBytes: 4096,
      checksumSha256,
    });

    expect(response.upload.method).toBe("PUT");
    expect(response.upload.url).toBe("https://storage.example/upload");
    expect(response).not.toHaveProperty("objectKey");
    expect(storage.signUpload).toHaveBeenCalledOnce();
  });

  it("marks a verified object ready", async () => {
    const { service, uploadAssetClient } = setup();
    const response = await service.complete(userId, uploadId);

    expect(response.status).toBe(UploadStatus.READY);
    expect(uploadAssetClient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: UploadStatus.READY }),
      }),
    );
  });

  it("deletes and quarantines an object with mismatched metadata", async () => {
    const { service, storage, uploadAssetClient } = setup();
    vi.mocked(storage.inspect).mockResolvedValue({
      contentType: "application/pdf",
      sizeBytes: 4097,
      checksumSha256,
    });

    await expect(service.complete(userId, uploadId)).rejects.toMatchObject({
      status: 422,
    });
    expect(storage.delete).toHaveBeenCalledOnce();
    expect(uploadAssetClient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: UploadStatus.QUARANTINED },
      }),
    );
  });
});
