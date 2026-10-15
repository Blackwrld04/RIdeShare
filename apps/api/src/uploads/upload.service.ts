import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import { type Prisma, UploadStatus } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import { inspectKycMedia } from "./kyc-media.policy.js";
import {
  ObjectStorage,
  objectExtensionForContentType,
  type StoredObject,
} from "./object-storage.js";
import type { CreateUploadInput } from "./upload.schemas.js";

type UploadAssetRecord = Prisma.UploadAssetGetPayload<Record<string, never>>;

export interface UploadResponse {
  id: string;
  purpose: string;
  documentKind: string | null;
  status: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  detectedContentType: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  uploadExpiresAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateUploadResponse extends UploadResponse {
  upload: {
    method: "PUT";
    url: string;
    headers: Record<string, string>;
  };
}

@Injectable()
export class UploadService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
  ) {}

  async create(
    userId: string,
    input: CreateUploadInput,
  ): Promise<CreateUploadResponse> {
    if (input.sizeBytes > this.config.UPLOAD_MAX_BYTES) {
      throw new BadRequestException("Upload exceeds configured size limit");
    }

    const id = randomUUID();
    const extension = objectExtensionForContentType(input.contentType);
    const objectKey = `users/${userId}/${input.purpose}/${input.documentKind}/${id}.${extension}`;
    const uploadExpiresAt = new Date(
      Date.now() + this.config.UPLOAD_URL_TTL_SECONDS * 1_000,
    );
    const asset = await this.database.client.uploadAsset.create({
      data: {
        id,
        ownerUserId: userId,
        purpose: input.purpose,
        documentKind: input.documentKind,
        objectKey,
        contentType: input.contentType,
        sizeBytes: BigInt(input.sizeBytes),
        checksumSha256: input.checksumSha256,
        uploadExpiresAt,
      },
    });

    try {
      const signed = await this.storage.signUpload({
        objectKey,
        contentType: input.contentType,
        checksumSha256: input.checksumSha256,
        expiresInSeconds: this.config.UPLOAD_URL_TTL_SECONDS,
      });

      return {
        ...this.toResponse(asset),
        upload: { method: "PUT", ...signed },
      };
    } catch {
      await this.database.client.uploadAsset.deleteMany({
        where: { id, ownerUserId: userId, status: UploadStatus.PENDING },
      });
      throw new ServiceUnavailableException("Unable to prepare upload");
    }
  }

  async get(userId: string, uploadId: string): Promise<UploadResponse> {
    return this.toResponse(await this.requireAsset(userId, uploadId));
  }

  async complete(userId: string, uploadId: string): Promise<UploadResponse> {
    const asset = await this.requireAsset(userId, uploadId);

    if (asset.status === UploadStatus.READY) {
      return this.toResponse(asset);
    }

    if (asset.status !== UploadStatus.PENDING) {
      throw new ConflictException(
        "Upload cannot be completed in its current state",
      );
    }

    if (asset.uploadExpiresAt <= new Date()) {
      await this.database.client.uploadAsset.updateMany({
        where: { id: asset.id, status: UploadStatus.PENDING },
        data: { status: UploadStatus.EXPIRED },
      });
      throw new GoneException("Upload intent has expired");
    }

    let stored: StoredObject | null;

    try {
      stored = await this.storage.inspect(asset.objectKey);
    } catch {
      throw new ServiceUnavailableException("Unable to verify upload");
    }

    if (!stored) {
      throw new BadRequestException("Uploaded object was not found");
    }

    const mismatches = this.getMismatches(asset, stored);

    if (mismatches.length > 0) {
      await this.storage.delete(asset.objectKey).catch(() => undefined);
      await this.database.client.uploadAsset.updateMany({
        where: { id: asset.id, status: UploadStatus.PENDING },
        data: { status: UploadStatus.QUARANTINED },
      });
      throw new UnprocessableEntityException({
        code: "UPLOAD_METADATA_MISMATCH",
        message: "Uploaded object does not match its intent",
        fields: mismatches,
      });
    }

    let bytes: Uint8Array | null;
    try {
      bytes = await this.storage.read(
        asset.objectKey,
        this.config.KYC_INSPECTION_MAX_BYTES,
      );
    } catch {
      throw new ServiceUnavailableException("Unable to inspect upload");
    }
    if (!bytes || !asset.documentKind) {
      throw new BadRequestException("Uploaded media could not be inspected");
    }
    const inspection = await inspectKycMedia(
      bytes,
      asset.documentKind,
      asset.contentType,
    );
    if (inspection.issues.length > 0) {
      await this.storage.delete(asset.objectKey).catch(() => undefined);
      await this.database.client.uploadAsset.updateMany({
        where: { id: asset.id, status: UploadStatus.PENDING },
        data: { status: UploadStatus.QUARANTINED },
      });
      throw new UnprocessableEntityException({
        code: "UPLOAD_MEDIA_INVALID",
        message: "Uploaded media failed inspection",
        fields: inspection.issues,
      });
    }

    const completedAt = new Date();
    const completed = await this.database.client.uploadAsset.updateMany({
      where: { id: asset.id, status: UploadStatus.PENDING },
      data: {
        status: UploadStatus.READY,
        completedAt,
        detectedContentType: inspection.detectedContentType,
        mediaWidth: inspection.width,
        mediaHeight: inspection.height,
      },
    });

    if (completed.count !== 1) {
      return this.get(userId, uploadId);
    }

    return this.toResponse({
      ...asset,
      status: UploadStatus.READY,
      completedAt,
      detectedContentType: inspection.detectedContentType,
      mediaWidth: inspection.width,
      mediaHeight: inspection.height,
    });
  }

  private async requireAsset(
    userId: string,
    uploadId: string,
  ): Promise<UploadAssetRecord> {
    const asset = await this.database.client.uploadAsset.findFirst({
      where: { id: uploadId, ownerUserId: userId },
    });

    if (!asset) {
      throw new NotFoundException("Upload not found");
    }

    return asset;
  }

  private getMismatches(
    asset: UploadAssetRecord,
    stored: StoredObject,
  ): string[] {
    const mismatches: string[] = [];

    if (stored.contentType !== asset.contentType) {
      mismatches.push("contentType");
    }
    if (stored.sizeBytes !== Number(asset.sizeBytes)) {
      mismatches.push("sizeBytes");
    }
    if (stored.checksumSha256 !== asset.checksumSha256) {
      mismatches.push("checksumSha256");
    }

    return mismatches;
  }

  private toResponse(asset: UploadAssetRecord): UploadResponse {
    return {
      id: asset.id,
      purpose: asset.purpose,
      documentKind: asset.documentKind,
      status: asset.status,
      contentType: asset.contentType,
      sizeBytes: Number(asset.sizeBytes),
      checksumSha256: asset.checksumSha256,
      detectedContentType: asset.detectedContentType,
      mediaWidth: asset.mediaWidth,
      mediaHeight: asset.mediaHeight,
      uploadExpiresAt: asset.uploadExpiresAt.toISOString(),
      completedAt: asset.completedAt?.toISOString() ?? null,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}
