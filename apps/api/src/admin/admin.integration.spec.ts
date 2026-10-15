import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import {
  BankAccountStatus,
  createDatabase,
  type Database,
  DriverApplicationStatus,
  DriverDocumentStatus,
  IdentityVerificationStatus,
  UserRole,
} from "@commuteshare/database";
import { ConflictException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { REQUIRED_DRIVER_DOCUMENT_KINDS } from "../driver/driver.policy.js";
import type { DatabaseService } from "../infrastructure/database.service.js";
import type { ObjectStorage } from "../uploads/object-storage.js";
import { AdminService } from "./admin.service.js";

const describeIntegration = process.env.ADMIN_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration("admin driver review integration", () => {
  let database: Database;
  let service: AdminService;
  let adminUserId: string;
  let approvableUserId: string;
  let rejectedUserId: string;
  let approvableApplicationId: string;
  let rejectedApplicationId: string;
  let firstDocumentId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.ADMIN_TEST_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("ADMIN_TEST_DATABASE_URL is required");
    }
    database = createDatabase(databaseUrl);
    const storage = {
      signDownload: vi
        .fn()
        .mockResolvedValue({ url: "https://storage.example/review" }),
    } as unknown as ObjectStorage;
    service = new AdminService(
      { UPLOAD_URL_TTL_SECONDS: 900 } as AppConfig,
      database as unknown as DatabaseService,
      storage,
    );
    const suffix = randomUUID().replaceAll("-", "");
    const admin = await database.client.user.create({
      data: {
        phoneE164: `+234701${suffix.slice(0, 6)}`,
        phoneVerifiedAt: new Date(),
        role: UserRole.ADMIN,
        profile: { create: { displayName: "Review Admin" } },
      },
    });
    adminUserId = admin.id;
    const approvable = await createApplication(
      database,
      `+234702${suffix.slice(0, 6)}`,
      suffix,
    );
    const rejected = await createApplication(
      database,
      `+234703${suffix.slice(0, 6)}`,
      suffix.split("").reverse().join(""),
    );
    approvableUserId = approvable.userId;
    rejectedUserId = rejected.userId;
    approvableApplicationId = approvable.applicationId;
    rejectedApplicationId = rejected.applicationId;
    firstDocumentId = approvable.documentIds[0] ?? "";
  });

  afterAll(async () => {
    const applicationIds = [
      approvableApplicationId,
      rejectedApplicationId,
    ].filter((id): id is string => Boolean(id));
    const userIds = [adminUserId, approvableUserId, rejectedUserId].filter(
      (id): id is string => Boolean(id),
    );
    await database.client.driverBankAccount.deleteMany({
      where: {
        driverApplicationId: { in: applicationIds },
      },
    });
    await database.client.userIdentityVerification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await database.client.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await database.close();
  });

  it("lists submitted applications and signs private document downloads", async () => {
    const queue = await service.listApplications({ limit: 50 });
    const download = await service.getDocumentDownload(
      approvableApplicationId,
      firstDocumentId,
    );

    expect(queue.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([approvableApplicationId, rejectedApplicationId]),
    );
    expect(download.url).toBe("https://storage.example/review");
  });

  it("requires every document decision before final approval", async () => {
    await expect(
      service.reviewApplication(adminUserId, approvableApplicationId, {
        decision: "approve",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const documents = await database.client.driverDocument.findMany({
      where: { driverApplicationId: approvableApplicationId },
      select: { id: true },
    });
    for (const document of documents) {
      await service.reviewDocument(
        adminUserId,
        approvableApplicationId,
        document.id,
        { decision: "approve" },
      );
    }
    const approved = await service.reviewApplication(
      adminUserId,
      approvableApplicationId,
      { decision: "approve" },
    );

    expect(approved.status).toBe(DriverApplicationStatus.APPROVED);
    expect(approved.reviewedBy?.userId).toBe(adminUserId);
    expect(approved.approvalIssues).toEqual([]);
    expect(
      await database.client.userNotification.count({
        where: {
          userId: approvableUserId,
          kind: "driver_application_approved",
        },
      }),
    ).toBe(1);
  });

  it("rejects a document, returns the application for editing, and notifies the driver", async () => {
    const document = await database.client.driverDocument.findFirstOrThrow({
      where: { driverApplicationId: rejectedApplicationId },
    });
    const rejected = await service.reviewDocument(
      adminUserId,
      rejectedApplicationId,
      document.id,
      { decision: "reject", reason: "The image is unreadable" },
    );

    expect(rejected.status).toBe(DriverApplicationStatus.REJECTED);
    expect(
      rejected.documents.find((item) => item.id === document.id),
    ).toMatchObject({
      status: DriverDocumentStatus.REJECTED,
      rejectionReason: "The image is unreadable",
    });
    expect(
      await database.client.userNotification.count({
        where: {
          userId: rejectedUserId,
          kind: "driver_document_rejected",
        },
      }),
    ).toBe(1);
  });
});

async function createApplication(
  database: Database,
  phoneE164: string,
  uniqueSeed: string,
) {
  const dateOfBirth = new Date("1992-04-12T00:00:00.000Z");
  const user = await database.client.user.create({
    data: {
      phoneE164,
      phoneVerifiedAt: new Date(),
      profile: { create: { displayName: "Ada Reviewer" } },
      identityVerification: {
        create: {
          status: IdentityVerificationStatus.VERIFIED,
          provider: "ninja",
          providerReference: `nin-${uniqueSeed.slice(0, 20)}`,
          ninCiphertext: new Uint8Array([1, 2, 3]),
          ninIv: new Uint8Array(12),
          ninAuthTag: new Uint8Array(16),
          ninLookupHash: uniqueSeed.padEnd(64, "a").slice(0, 64),
          ninLast4: "7777",
          legalFirstName: "Ada",
          legalLastName: "Reviewer",
          dateOfBirth,
          consentVersion: "2026-10-01",
          consentedAt: new Date(),
          verifiedAt: new Date(),
        },
      },
    },
  });
  const application = await database.client.driverApplication.create({
    data: {
      userId: user.id,
      status: DriverApplicationStatus.SUBMITTED,
      legalFirstName: "Ada",
      legalLastName: "Reviewer",
      dateOfBirth,
      residentialAddress: "12 Marina Road",
      city: "Lagos",
      state: "Lagos",
      submittedAt: new Date(),
      vehicle: {
        create: {
          make: "Toyota",
          model: "Corolla",
          color: "Silver",
          year: 2022,
          registrationNumber: `LND${uniqueSeed.slice(0, 8)}`,
          seatCapacity: 4,
        },
      },
      documents: {
        create: REQUIRED_DRIVER_DOCUMENT_KINDS.map((kind, index) => ({
          kind,
          storageKey: `reviews/${uniqueSeed}/${kind}.pdf`,
          contentType: "application/pdf",
          sizeBytes: 2048n + BigInt(index),
          checksumSha256: uniqueSeed.padEnd(64, String(index)).slice(0, 64),
          expiresOn: new Date("2028-01-01T00:00:00.000Z"),
        })),
      },
    },
    include: { documents: { select: { id: true } } },
  });
  await database.client.driverBankAccount.create({
    data: {
      driverApplicationId: application.id,
      status: BankAccountStatus.VERIFIED,
      bankCode: "058",
      bankName: "GTBank",
      accountName: "ADA REVIEWER",
      accountNumberLast4: "6789",
      providerRecipientCode: `RCP_${uniqueSeed.slice(0, 20)}`,
      resolvedAt: new Date(),
    },
  });
  return {
    userId: user.id,
    applicationId: application.id,
    documentIds: application.documents.map((document) => document.id),
  };
}
