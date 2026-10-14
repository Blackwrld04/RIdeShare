import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import { IdentityVerificationStatus, Prisma } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import type { VerifyNinInput } from "./identity.schemas.js";
import { digestNin, protectNin } from "./identity-crypto.js";
import { NinProvider, type VerifyNinProviderResult } from "./nin-provider.js";

interface IdentityVerificationRecord {
  status: IdentityVerificationStatus;
  provider: string;
  ninLast4: string;
  ninLookupHash: string;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: Date;
  consentVersion: string;
  consentedAt: Date;
  verifiedAt: Date | null;
  updatedAt: Date;
}

export interface IdentityVerificationSummary {
  status: string;
  provider: string;
  maskedNin: string;
  consentVersion: string;
  consentedAt: string;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface IdentityVerificationState {
  currentConsentVersion: string;
  verification: IdentityVerificationSummary | null;
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(NinProvider) private readonly provider: NinProvider,
  ) {}

  async get(userId: string): Promise<IdentityVerificationState> {
    const verification =
      await this.database.client.userIdentityVerification.findUnique({
        where: { userId },
      });

    return {
      currentConsentVersion: this.config.NIN_CONSENT_VERSION,
      verification: verification ? this.toSummary(verification) : null,
    };
  }

  async verify(
    userId: string,
    input: VerifyNinInput,
  ): Promise<IdentityVerificationState> {
    if (input.consentVersion !== this.config.NIN_CONSENT_VERSION) {
      throw new BadRequestException("Consent version is no longer current");
    }

    const ninLookupHash = digestNin(
      input.nin,
      this.config.IDENTITY_HMAC_SECRET,
    );
    const existing =
      await this.database.client.userIdentityVerification.findUnique({
        where: { userId },
      });

    if (existing?.status === IdentityVerificationStatus.VERIFIED) {
      if (this.isSameVerifiedIdentity(existing, ninLookupHash, input)) {
        return this.get(userId);
      }
      throw new ConflictException("Verified identity cannot be replaced");
    }

    if (existing && this.isCoolingDown(existing.updatedAt)) {
      throw new HttpException(
        "Identity verification retry is temporarily limited",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const owner =
      await this.database.client.userIdentityVerification.findUnique({
        where: { ninLookupHash },
        select: { userId: true },
      });

    if (owner && owner.userId !== userId) {
      throw new ConflictException("Identity is already linked to an account");
    }

    const protectedNin = protectNin(
      input.nin,
      this.config.IDENTITY_ENCRYPTION_KEY,
    );
    const reference = `nin-${randomUUID()}`;
    const consentedAt = new Date();
    const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);

    try {
      await this.database.client.userIdentityVerification.upsert({
        where: { userId },
        create: {
          userId,
          status: IdentityVerificationStatus.PENDING,
          provider: this.config.NIN_PROVIDER,
          providerReference: reference,
          ninCiphertext: protectedNin.ciphertext,
          ninIv: protectedNin.iv,
          ninAuthTag: protectedNin.authTag,
          ninLookupHash,
          ninLast4: input.nin.slice(-4),
          legalFirstName: input.legalFirstName,
          legalLastName: input.legalLastName,
          dateOfBirth,
          consentVersion: input.consentVersion,
          consentedAt,
        },
        update: {
          status: IdentityVerificationStatus.PENDING,
          provider: this.config.NIN_PROVIDER,
          providerReference: reference,
          ninCiphertext: protectedNin.ciphertext,
          ninIv: protectedNin.iv,
          ninAuthTag: protectedNin.authTag,
          ninLookupHash,
          ninLast4: input.nin.slice(-4),
          legalFirstName: input.legalFirstName,
          legalLastName: input.legalLastName,
          dateOfBirth,
          consentVersion: input.consentVersion,
          consentedAt,
          failureReason: null,
          verifiedAt: null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Identity is already linked to an account");
      }
      throw error;
    }

    let result: VerifyNinProviderResult;

    try {
      result = await this.provider.verify({
        nin: input.nin,
        legalFirstName: input.legalFirstName,
        legalLastName: input.legalLastName,
        dateOfBirth: input.dateOfBirth,
        reference,
      });
    } catch {
      const updated =
        await this.database.client.userIdentityVerification.updateMany({
          where: { userId, providerReference: reference },
          data: { failureReason: "provider_unavailable" },
        });
      this.assertCurrentAttempt(updated.count);
      throw new ServiceUnavailableException(
        "Identity provider is temporarily unavailable",
      );
    }

    if (!result.found || !result.verified) {
      const updated =
        await this.database.client.userIdentityVerification.updateMany({
          where: { userId, providerReference: reference },
          data: {
            status: IdentityVerificationStatus.FAILED,
            failureReason: result.found
              ? "identity_details_mismatch"
              : "nin_not_found",
          },
        });
      this.assertCurrentAttempt(updated.count);
      throw new UnprocessableEntityException({
        code: "IDENTITY_VERIFICATION_FAILED",
        message: "NIN and legal identity details could not be verified",
      });
    }

    const updated =
      await this.database.client.userIdentityVerification.updateMany({
        where: { userId, providerReference: reference },
        data: {
          status: IdentityVerificationStatus.VERIFIED,
          failureReason: null,
          verifiedAt: new Date(),
        },
      });
    this.assertCurrentAttempt(updated.count);

    return this.get(userId);
  }

  private isCoolingDown(updatedAt: Date): boolean {
    return (
      updatedAt.getTime() >
      Date.now() - this.config.NIN_RETRY_COOLDOWN_SECONDS * 1_000
    );
  }

  private assertCurrentAttempt(updatedCount: number): void {
    if (updatedCount !== 1) {
      throw new ConflictException(
        "A newer identity verification is in progress",
      );
    }
  }

  private isSameVerifiedIdentity(
    existing: IdentityVerificationRecord,
    ninLookupHash: string,
    input: VerifyNinInput,
  ): boolean {
    return (
      existing.ninLookupHash === ninLookupHash &&
      existing.legalFirstName === input.legalFirstName &&
      existing.legalLastName === input.legalLastName &&
      existing.dateOfBirth.toISOString().slice(0, 10) === input.dateOfBirth
    );
  }

  private toSummary(
    verification: IdentityVerificationRecord,
  ): IdentityVerificationSummary {
    return {
      status: verification.status,
      provider: verification.provider,
      maskedNin: `*******${verification.ninLast4}`,
      consentVersion: verification.consentVersion,
      consentedAt: verification.consentedAt.toISOString(),
      verifiedAt: verification.verifiedAt?.toISOString() ?? null,
      updatedAt: verification.updatedAt.toISOString(),
    };
  }
}
