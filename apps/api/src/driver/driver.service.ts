import {
  DriverApplicationStatus,
  DriverDocumentStatus,
  type Prisma,
  UploadStatus,
} from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  getDriverSubmissionIssues,
  REQUIRED_DRIVER_DOCUMENT_KINDS,
} from "./driver.policy.js";
import type {
  UpdateDriverDetailsInput,
  UpsertDriverDocumentInput,
  UpsertDriverVehicleInput,
} from "./driver.schemas.js";

const applicationInclude = {
  user: { select: { profile: { select: { displayName: true } } } },
  vehicle: true,
  documents: { orderBy: { kind: "asc" } },
} satisfies Prisma.DriverApplicationInclude;

type DriverApplicationRecord = Prisma.DriverApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

type UploadAssetRecord = Prisma.UploadAssetGetPayload<Record<string, never>>;

export interface DriverApplicationResponse {
  id: string;
  status: string;
  details: {
    legalFirstName: string | null;
    legalLastName: string | null;
    dateOfBirth: string | null;
    residentialAddress: string | null;
    city: string | null;
    state: string | null;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    color: string;
    year: number;
    registrationNumber: string;
    seatCapacity: number;
  } | null;
  documents: Array<{
    id: string;
    uploadId: string | null;
    kind: string;
    contentType: string;
    sizeBytes: number;
    checksumSha256: string;
    issuedOn: string | null;
    expiresOn: string | null;
    status: string;
    rejectionReason: string | null;
  }>;
  requiredDocumentKinds: readonly string[];
  requirements: string[];
  readyToSubmit: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DriverService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async ensureApplication(userId: string): Promise<DriverApplicationResponse> {
    const application = await this.database.client.driverApplication.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: applicationInclude,
    });

    return this.toResponse(application);
  }

  async getApplication(userId: string): Promise<DriverApplicationResponse> {
    return this.toResponse(await this.requireApplication(userId));
  }

  async updateDetails(
    userId: string,
    input: UpdateDriverDetailsInput,
  ): Promise<DriverApplicationResponse> {
    const application = await this.requireApplication(userId);
    this.assertEditable(application.status);
    const data: Prisma.DriverApplicationUpdateInput = {};

    if (input.legalFirstName !== undefined) {
      data.legalFirstName = input.legalFirstName;
    }
    if (input.legalLastName !== undefined) {
      data.legalLastName = input.legalLastName;
    }
    if (input.dateOfBirth !== undefined) {
      data.dateOfBirth = this.toDate(input.dateOfBirth);
    }
    if (input.residentialAddress !== undefined) {
      data.residentialAddress = input.residentialAddress;
    }
    if (input.city !== undefined) {
      data.city = input.city;
    }
    if (input.state !== undefined) {
      data.state = input.state;
    }
    await this.database.client.$transaction(async (transaction) => {
      await this.claimEditable(transaction, application.id);
      await transaction.driverApplication.update({
        where: { id: application.id },
        data,
      });
    });

    return this.getApplication(userId);
  }

  async upsertVehicle(
    userId: string,
    input: UpsertDriverVehicleInput,
  ): Promise<DriverApplicationResponse> {
    const application = await this.requireApplication(userId);
    this.assertEditable(application.status);

    await this.database.client.$transaction(async (transaction) => {
      await this.claimEditable(transaction, application.id);
      await transaction.driverVehicle.upsert({
        where: { driverApplicationId: application.id },
        create: { driverApplicationId: application.id, ...input },
        update: input,
      });
    });

    return this.getApplication(userId);
  }

  async upsertDocument(
    userId: string,
    kind: string,
    input: UpsertDriverDocumentInput,
  ): Promise<DriverApplicationResponse> {
    const application = await this.requireApplication(userId);
    this.assertEditable(application.status);

    await this.database.client.$transaction(async (transaction) => {
      await this.claimEditable(transaction, application.id);
      const asset = await transaction.uploadAsset.findFirst({
        where: {
          id: input.uploadId,
          ownerUserId: userId,
          purpose: "driver_document",
          status: UploadStatus.READY,
        },
      });

      if (!asset) {
        throw new BadRequestException("Upload is not ready for attachment");
      }

      const attachment = await transaction.driverDocument.findUnique({
        where: { assetId: asset.id },
        select: { driverApplicationId: true, kind: true },
      });

      if (
        attachment &&
        (attachment.driverApplicationId !== application.id ||
          attachment.kind !== kind)
      ) {
        throw new ConflictException("Upload is already attached to a document");
      }

      await transaction.driverDocument.upsert({
        where: {
          driverApplicationId_kind: {
            driverApplicationId: application.id,
            kind,
          },
        },
        create: {
          driverApplicationId: application.id,
          kind,
          ...this.documentData(asset, input),
        },
        update: {
          ...this.documentData(asset, input),
          status: DriverDocumentStatus.PENDING,
          rejectionReason: null,
        },
      });
    });

    return this.getApplication(userId);
  }

  async deleteDocument(userId: string, kind: string): Promise<void> {
    const application = await this.requireApplication(userId);
    this.assertEditable(application.status);

    await this.database.client.$transaction(async (transaction) => {
      await this.claimEditable(transaction, application.id);
      await transaction.driverDocument.deleteMany({
        where: { driverApplicationId: application.id, kind },
      });
    });
  }

  async submit(userId: string): Promise<DriverApplicationResponse> {
    const application = await this.requireApplication(userId);
    this.assertEditable(application.status);

    await this.database.client.$transaction(async (transaction) => {
      await this.claimEditable(transaction, application.id);
      const current = await transaction.driverApplication.findUnique({
        where: { id: application.id },
        include: applicationInclude,
      });

      if (!current) {
        throw new NotFoundException("Driver application not found");
      }

      const requirements = this.requirements(current);

      if (requirements.length > 0) {
        throw new BadRequestException({
          code: "DRIVER_APPLICATION_INCOMPLETE",
          message: "Driver application is incomplete",
          requirements,
        });
      }

      await transaction.driverApplication.update({
        where: { id: application.id },
        data: {
          status: DriverApplicationStatus.SUBMITTED,
          submittedAt: new Date(),
          reviewedAt: null,
          decisionReason: null,
        },
      });
    });

    return this.getApplication(userId);
  }

  private async requireApplication(
    userId: string,
  ): Promise<DriverApplicationRecord> {
    const application = await this.database.client.driverApplication.findUnique(
      {
        where: { userId },
        include: applicationInclude,
      },
    );

    if (!application) {
      throw new NotFoundException("Driver application not found");
    }

    return application;
  }

  private assertEditable(status: DriverApplicationStatus): void {
    if (
      status !== DriverApplicationStatus.DRAFT &&
      status !== DriverApplicationStatus.REJECTED
    ) {
      throw new ConflictException(
        "Driver application cannot be edited in its current state",
      );
    }
  }

  private async claimEditable(
    transaction: Prisma.TransactionClient,
    applicationId: string,
  ): Promise<void> {
    const claimed = await transaction.driverApplication.updateMany({
      where: {
        id: applicationId,
        status: {
          in: [DriverApplicationStatus.DRAFT, DriverApplicationStatus.REJECTED],
        },
      },
      data: { status: DriverApplicationStatus.DRAFT },
    });

    if (claimed.count !== 1) {
      throw new ConflictException(
        "Driver application cannot be edited in its current state",
      );
    }
  }

  private requirements(application: DriverApplicationRecord): string[] {
    return getDriverSubmissionIssues({
      profileDisplayName: application.user.profile?.displayName ?? null,
      legalFirstName: application.legalFirstName,
      legalLastName: application.legalLastName,
      dateOfBirth: application.dateOfBirth,
      residentialAddress: application.residentialAddress,
      city: application.city,
      state: application.state,
      vehicle: application.vehicle,
      documents: application.documents,
    });
  }

  private toResponse(
    application: DriverApplicationRecord,
  ): DriverApplicationResponse {
    const requirements = this.requirements(application);
    const editable =
      application.status === DriverApplicationStatus.DRAFT ||
      application.status === DriverApplicationStatus.REJECTED;

    return {
      id: application.id,
      status: application.status,
      details: {
        legalFirstName: application.legalFirstName,
        legalLastName: application.legalLastName,
        dateOfBirth: this.toDateOnly(application.dateOfBirth),
        residentialAddress: application.residentialAddress,
        city: application.city,
        state: application.state,
      },
      vehicle: application.vehicle
        ? {
            id: application.vehicle.id,
            make: application.vehicle.make,
            model: application.vehicle.model,
            color: application.vehicle.color,
            year: application.vehicle.year,
            registrationNumber: application.vehicle.registrationNumber,
            seatCapacity: application.vehicle.seatCapacity,
          }
        : null,
      documents: application.documents.map((document) => ({
        id: document.id,
        uploadId: document.assetId,
        kind: document.kind,
        contentType: document.contentType,
        sizeBytes: Number(document.sizeBytes),
        checksumSha256: document.checksumSha256,
        issuedOn: this.toDateOnly(document.issuedOn),
        expiresOn: this.toDateOnly(document.expiresOn),
        status: document.status,
        rejectionReason: document.rejectionReason,
      })),
      requiredDocumentKinds: REQUIRED_DRIVER_DOCUMENT_KINDS,
      requirements,
      readyToSubmit: editable && requirements.length === 0,
      submittedAt: application.submittedAt?.toISOString() ?? null,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      decisionReason: application.decisionReason,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  private documentData(
    asset: UploadAssetRecord,
    input: UpsertDriverDocumentInput,
  ) {
    return {
      assetId: asset.id,
      storageKey: asset.objectKey,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      checksumSha256: asset.checksumSha256,
      issuedOn: input.issuedOn ? this.toDate(input.issuedOn) : null,
      expiresOn: input.expiresOn ? this.toDate(input.expiresOn) : null,
    };
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toDateOnly(value: Date | null): string | null {
    return value?.toISOString().slice(0, 10) ?? null;
  }
}
