import type { AppConfig } from "@commuteshare/config";
import {
  DriverApplicationStatus,
  DriverDocumentStatus,
  Prisma,
} from "@commuteshare/database";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import {
  getDriverSubmissionIssues,
  REQUIRED_DRIVER_DOCUMENT_KINDS,
} from "../driver/driver.policy.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import { ObjectStorage } from "../uploads/object-storage.js";
import type {
  ListAdminApplicationsInput,
  ReviewDecisionInput,
} from "./admin.schemas.js";

const adminApplicationInclude = {
  user: {
    select: {
      id: true,
      phoneE164: true,
      profile: { select: { displayName: true } },
      identityVerification: {
        select: {
          status: true,
          ninLast4: true,
          legalFirstName: true,
          legalLastName: true,
          dateOfBirth: true,
          verifiedAt: true,
        },
      },
    },
  },
  reviewedBy: {
    select: {
      id: true,
      phoneE164: true,
      profile: { select: { displayName: true } },
    },
  },
  vehicle: true,
  bankAccount: true,
  documents: {
    orderBy: { kind: "asc" },
    include: {
      reviewedBy: {
        select: {
          id: true,
          phoneE164: true,
          profile: { select: { displayName: true } },
        },
      },
    },
  },
} satisfies Prisma.DriverApplicationInclude;

type AdminApplicationRecord = Prisma.DriverApplicationGetPayload<{
  include: typeof adminApplicationInclude;
}>;

const reviewableStatuses: DriverApplicationStatus[] = [
  DriverApplicationStatus.SUBMITTED,
  DriverApplicationStatus.UNDER_REVIEW,
];

@Injectable()
export class AdminService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
  ) {}

  async listApplications(input: ListAdminApplicationsInput) {
    const applications = await this.database.client.driverApplication.findMany({
      where: {
        status: input.status ? input.status : { in: reviewableStatuses },
      },
      orderBy: { id: "asc" },
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        decisionReason: true,
        user: {
          select: {
            id: true,
            phoneE164: true,
            profile: { select: { displayName: true } },
          },
        },
        documents: { select: { status: true } },
      },
    });
    const hasMore = applications.length > input.limit;
    const page = hasMore ? applications.slice(0, input.limit) : applications;

    return {
      items: page.map((application) => ({
        id: application.id,
        status: application.status,
        driver: {
          userId: application.user.id,
          displayName: application.user.profile?.displayName ?? null,
          phoneE164: application.user.phoneE164,
        },
        documentSummary: {
          pending: application.documents.filter(
            (document) => document.status === DriverDocumentStatus.PENDING,
          ).length,
          approved: application.documents.filter(
            (document) => document.status === DriverDocumentStatus.APPROVED,
          ).length,
          rejected: application.documents.filter(
            (document) => document.status === DriverDocumentStatus.REJECTED,
          ).length,
        },
        submittedAt: application.submittedAt?.toISOString() ?? null,
        reviewedAt: application.reviewedAt?.toISOString() ?? null,
        decisionReason: application.decisionReason,
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async getApplication(applicationId: string) {
    const application = await this.requireApplication(applicationId);
    return this.toApplicationResponse(application);
  }

  async getDocumentDownload(applicationId: string, documentId: string) {
    const document = await this.database.client.driverDocument.findFirst({
      where: { id: documentId, driverApplicationId: applicationId },
      select: { storageKey: true },
    });
    if (!document) {
      throw new NotFoundException("Driver document not found");
    }
    const expiresAt = new Date(
      Date.now() + this.config.UPLOAD_URL_TTL_SECONDS * 1_000,
    );

    try {
      const download = await this.storage.signDownload(
        document.storageKey,
        this.config.UPLOAD_URL_TTL_SECONDS,
      );
      return { ...download, expiresAt: expiresAt.toISOString() };
    } catch {
      throw new ServiceUnavailableException("Unable to prepare download");
    }
  }

  async reviewDocument(
    operatorUserId: string,
    applicationId: string,
    documentId: string,
    input: ReviewDecisionInput,
  ) {
    await this.database.client.$transaction(async (transaction) => {
      await this.lockApplication(transaction, applicationId);
      const application = await transaction.driverApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, userId: true, status: true },
      });
      this.assertReviewable(application);
      const document = await transaction.driverDocument.findFirst({
        where: { id: documentId, driverApplicationId: applicationId },
        select: { id: true, kind: true, updatedAt: true },
      });
      if (!document) {
        throw new NotFoundException("Driver document not found");
      }
      const now = new Date();
      const approved = input.decision === "approve";

      await transaction.driverDocument.update({
        where: { id: document.id },
        data: {
          status: approved
            ? DriverDocumentStatus.APPROVED
            : DriverDocumentStatus.REJECTED,
          rejectionReason: approved ? null : (input.reason ?? null),
          reviewedAt: now,
          reviewedByUserId: operatorUserId,
        },
      });
      await transaction.driverApplication.update({
        where: { id: application.id },
        data: approved
          ? {
              status: DriverApplicationStatus.UNDER_REVIEW,
              reviewedByUserId: operatorUserId,
              reviewedAt: null,
              decisionReason: null,
            }
          : {
              status: DriverApplicationStatus.REJECTED,
              reviewedByUserId: operatorUserId,
              reviewedAt: now,
              decisionReason: input.reason ?? null,
            },
      });
      if (!approved) {
        await transaction.userNotification.create({
          data: {
            userId: application.userId,
            kind: "driver_document_rejected",
            title: "Driver document needs attention",
            body: input.reason ?? "A driver document was rejected",
            idempotencyKey: `driver-document:${document.id}:rejected:${document.updatedAt.getTime()}`,
            data: {
              applicationId,
              documentId,
              documentKind: document.kind,
            },
          },
        });
      }
    });

    return this.getApplication(applicationId);
  }

  async reviewApplication(
    operatorUserId: string,
    applicationId: string,
    input: ReviewDecisionInput,
  ) {
    await this.database.client.$transaction(async (transaction) => {
      await this.lockApplication(transaction, applicationId);
      const application = await transaction.driverApplication.findUnique({
        where: { id: applicationId },
        include: adminApplicationInclude,
      });
      this.assertReviewable(application);
      const now = new Date();
      const approved = input.decision === "approve";

      if (approved) {
        const issues = this.getApprovalIssues(application);
        if (issues.length > 0) {
          throw new ConflictException({
            code: "DRIVER_APPLICATION_NOT_APPROVABLE",
            message: "Driver application cannot be approved",
            requirements: issues,
          });
        }
      }

      await transaction.driverApplication.update({
        where: { id: application.id },
        data: {
          status: approved
            ? DriverApplicationStatus.APPROVED
            : DriverApplicationStatus.REJECTED,
          reviewedByUserId: operatorUserId,
          reviewedAt: now,
          decisionReason: input.reason ?? null,
        },
      });
      await transaction.userNotification.create({
        data: {
          userId: application.userId,
          kind: approved
            ? "driver_application_approved"
            : "driver_application_rejected",
          title: approved
            ? "Driver application approved"
            : "Driver application needs attention",
          body: approved
            ? "You can now publish rides as a driver"
            : (input.reason ?? "Your driver application was rejected"),
          idempotencyKey: `driver-application:${application.id}:${input.decision}:${application.updatedAt.getTime()}`,
          data: { applicationId },
        },
      });
    });

    return this.getApplication(applicationId);
  }

  private async requireApplication(
    applicationId: string,
  ): Promise<AdminApplicationRecord> {
    const application = await this.database.client.driverApplication.findUnique(
      {
        where: { id: applicationId },
        include: adminApplicationInclude,
      },
    );
    if (!application) {
      throw new NotFoundException("Driver application not found");
    }
    return application;
  }

  private assertReviewable(
    application: { id: string; status: DriverApplicationStatus } | null,
  ): asserts application is { id: string; status: DriverApplicationStatus } {
    if (!application) {
      throw new NotFoundException("Driver application not found");
    }
    if (!reviewableStatuses.includes(application.status)) {
      throw new ConflictException("Driver application is not awaiting review");
    }
  }

  private async lockApplication(
    transaction: Prisma.TransactionClient,
    applicationId: string,
  ): Promise<void> {
    await transaction.$queryRaw(
      Prisma.sql`SELECT id FROM driver_applications WHERE id = ${applicationId}::uuid FOR UPDATE`,
    );
  }

  private getApprovalIssues(application: AdminApplicationRecord): string[] {
    const issues = getDriverSubmissionIssues({
      profileDisplayName: application.user.profile?.displayName ?? null,
      legalFirstName: application.legalFirstName,
      legalLastName: application.legalLastName,
      dateOfBirth: application.dateOfBirth,
      residentialAddress: application.residentialAddress,
      city: application.city,
      state: application.state,
      vehicle: application.vehicle,
      bankAccountStatus: application.bankAccount?.status ?? null,
      identityVerification: application.user.identityVerification,
      documents: application.documents,
    });
    const documents = new Map(
      application.documents.map((document) => [document.kind, document]),
    );
    for (const kind of REQUIRED_DRIVER_DOCUMENT_KINDS) {
      if (documents.get(kind)?.status !== DriverDocumentStatus.APPROVED) {
        issues.push(`documents.${kind}.approval`);
      }
    }
    return [...new Set(issues)];
  }

  private toApplicationResponse(application: AdminApplicationRecord) {
    return {
      id: application.id,
      status: application.status,
      driver: {
        userId: application.user.id,
        displayName: application.user.profile?.displayName ?? null,
        phoneE164: application.user.phoneE164,
      },
      details: {
        legalFirstName: application.legalFirstName,
        legalLastName: application.legalLastName,
        dateOfBirth: this.toDateOnly(application.dateOfBirth),
        residentialAddress: application.residentialAddress,
        city: application.city,
        state: application.state,
      },
      identityVerification: application.user.identityVerification
        ? {
            status: application.user.identityVerification.status,
            maskedNin: `*******${application.user.identityVerification.ninLast4}`,
            verifiedAt:
              application.user.identityVerification.verifiedAt?.toISOString() ??
              null,
          }
        : null,
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
      bankAccount: application.bankAccount
        ? {
            status: application.bankAccount.status,
            bankName: application.bankAccount.bankName,
            accountName: application.bankAccount.accountName,
            maskedAccountNumber: `******${application.bankAccount.accountNumberLast4}`,
          }
        : null,
      documents: application.documents.map((document) => ({
        id: document.id,
        kind: document.kind,
        contentType: document.contentType,
        sizeBytes: Number(document.sizeBytes),
        checksumSha256: document.checksumSha256,
        issuedOn: this.toDateOnly(document.issuedOn),
        expiresOn: this.toDateOnly(document.expiresOn),
        status: document.status,
        rejectionReason: document.rejectionReason,
        reviewedAt: document.reviewedAt?.toISOString() ?? null,
        reviewedBy: this.toReviewer(document.reviewedBy),
      })),
      approvalIssues: this.getApprovalIssues(application),
      submittedAt: application.submittedAt?.toISOString() ?? null,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      reviewedBy: this.toReviewer(application.reviewedBy),
      decisionReason: application.decisionReason,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  private toReviewer(
    reviewer: {
      id: string;
      phoneE164: string;
      profile: { displayName: string | null } | null;
    } | null,
  ) {
    return reviewer
      ? {
          userId: reviewer.id,
          displayName: reviewer.profile?.displayName ?? null,
          phoneE164: reviewer.phoneE164,
        }
      : null;
  }

  private toDateOnly(value: Date | null): string | null {
    return value?.toISOString().slice(0, 10) ?? null;
  }
}
