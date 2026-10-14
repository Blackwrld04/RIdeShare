import { randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import { UserStatus } from "@commuteshare/database";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_CONFIG } from "../config.provider.js";
import { DatabaseService } from "../infrastructure/database.service.js";
import type {
  RefreshSessionInput,
  RequestOtpInput,
  VerifyOtpInput,
} from "./auth.schemas.js";
import { createOtp, digestSecret, secretsMatch } from "./auth-crypto.js";
import { OtpDelivery } from "./otp-delivery.js";
import { normalizeNigerianPhone } from "./phone-number.js";
import { TokenService } from "./token.service.js";

export interface OtpChallengeResponse {
  challengeId: string;
  expiresAt: string;
  retryAfterSeconds: number;
}

export interface AuthTokensResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  isNewUser: boolean;
  profileComplete: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(OtpDelivery) private readonly otpDelivery: OtpDelivery,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<OtpChallengeResponse> {
    let phoneE164: string;

    try {
      phoneE164 = normalizeNigerianPhone(input.phone);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid phone";
      throw new BadRequestException(message);
    }

    const now = new Date();
    const cooldownStart = new Date(
      now.getTime() - this.config.OTP_REQUEST_COOLDOWN_SECONDS * 1_000,
    );
    const windowStart = new Date(
      now.getTime() - this.config.OTP_REQUEST_WINDOW_SECONDS * 1_000,
    );
    const [latest, requestCount] = await Promise.all([
      this.database.client.phoneOtpChallenge.findFirst({
        where: { phoneE164 },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.database.client.phoneOtpChallenge.count({
        where: { phoneE164, createdAt: { gte: windowStart } },
      }),
    ]);

    if (latest && latest.createdAt > cooldownStart) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - latest.createdAt.getTime()) / 1_000,
      );
      throw this.rateLimit(
        Math.max(1, this.config.OTP_REQUEST_COOLDOWN_SECONDS - elapsedSeconds),
      );
    }

    if (requestCount >= this.config.OTP_MAX_REQUESTS_PER_WINDOW) {
      throw this.rateLimit(this.config.OTP_REQUEST_WINDOW_SECONDS);
    }

    const challengeId = randomUUID();
    const code = createOtp(this.config.OTP_DEV_CODE);
    const expiresAt = new Date(
      now.getTime() + this.config.OTP_TTL_SECONDS * 1_000,
    );
    const codeDigest = digestSecret(
      this.config.OTP_HMAC_SECRET,
      `${challengeId}:${code}`,
    );

    await this.database.client.$transaction([
      this.database.client.phoneOtpChallenge.updateMany({
        where: { phoneE164, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.database.client.phoneOtpChallenge.create({
        data: {
          id: challengeId,
          phoneE164,
          codeDigest,
          expiresAt,
          maxAttempts: this.config.OTP_MAX_ATTEMPTS,
        },
      }),
    ]);

    try {
      await this.otpDelivery.send({
        phoneE164,
        code,
        expiresInSeconds: this.config.OTP_TTL_SECONDS,
      });
    } catch {
      await this.database.client.phoneOtpChallenge.updateMany({
        where: { id: challengeId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      throw new ServiceUnavailableException("Unable to send verification code");
    }

    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      retryAfterSeconds: this.config.OTP_REQUEST_COOLDOWN_SECONDS,
    };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthTokensResponse> {
    const now = new Date();
    const challenge = await this.database.client.phoneOtpChallenge.findUnique({
      where: { id: input.challengeId },
    });

    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= challenge.maxAttempts
    ) {
      throw this.invalidOtp();
    }

    const suppliedDigest = digestSecret(
      this.config.OTP_HMAC_SECRET,
      `${challenge.id}:${input.code}`,
    );

    if (!secretsMatch(challenge.codeDigest, suppliedDigest)) {
      const isFinalAttempt = challenge.attempts + 1 >= challenge.maxAttempts;
      await this.database.client.phoneOtpChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: isFinalAttempt
          ? { attempts: { increment: 1 }, consumedAt: now }
          : { attempts: { increment: 1 } },
      });
      throw this.invalidOtp();
    }

    const sessionId = randomUUID();
    const refresh = this.tokens.createRefreshToken(sessionId);
    const refreshExpiresAt = new Date(
      now.getTime() +
        this.config.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000,
    );
    const result = await this.database.client.$transaction(
      async (transaction) => {
        const claimed = await transaction.phoneOtpChallenge.updateMany({
          where: {
            id: challenge.id,
            consumedAt: null,
            expiresAt: { gt: now },
            attempts: { lt: challenge.maxAttempts },
          },
          data: { consumedAt: now },
        });

        if (claimed.count !== 1) {
          throw this.invalidOtp();
        }

        const existing = await transaction.user.findUnique({
          where: { phoneE164: challenge.phoneE164 },
          select: { id: true, status: true },
        });

        if (existing && existing.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException("Account is not active");
        }

        const user = await transaction.user.upsert({
          where: { phoneE164: challenge.phoneE164 },
          create: {
            phoneE164: challenge.phoneE164,
            phoneVerifiedAt: now,
            profile: { create: {} },
          },
          update: { phoneVerifiedAt: now },
          include: { profile: { select: { displayName: true } } },
        });

        await transaction.authSession.create({
          data: {
            id: sessionId,
            userId: user.id,
            refreshTokenDigest: refresh.digest,
            expiresAt: refreshExpiresAt,
          },
        });

        return {
          userId: user.id,
          isNewUser: existing === null,
          profileComplete: Boolean(user.profile?.displayName),
        };
      },
    );
    const accessToken = await this.tokens.createAccessToken({
      userId: result.userId,
      sessionId,
    });

    return {
      accessToken,
      accessTokenExpiresIn: this.config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      isNewUser: result.isNewUser,
      profileComplete: result.profileComplete,
    };
  }

  async refreshSession(
    input: RefreshSessionInput,
  ): Promise<Omit<AuthTokensResponse, "isNewUser" | "profileComplete">> {
    const credential = this.tokens.parseRefreshToken(input.refreshToken);
    const now = new Date();
    const session = await this.database.client.authSession.findUnique({
      where: { id: credential.sessionId },
      include: { user: { select: { id: true, status: true } } },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw this.invalidRefreshToken();
    }

    if (
      !this.tokens.refreshSecretMatches(
        session.refreshTokenDigest,
        credential.secret,
      )
    ) {
      await this.database.client.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw this.invalidRefreshToken();
    }

    const refresh = this.tokens.createRefreshToken(session.id);
    const rotated = await this.database.client.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenDigest: session.refreshTokenDigest,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenDigest: refresh.digest,
        lastUsedAt: now,
      },
    });

    if (rotated.count !== 1) {
      throw this.invalidRefreshToken();
    }

    const accessToken = await this.tokens.createAccessToken({
      userId: session.user.id,
      sessionId: session.id,
    });

    return {
      accessToken,
      accessTokenExpiresIn: this.config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: session.expiresAt.toISOString(),
    };
  }

  async logout(input: RefreshSessionInput): Promise<void> {
    const credential = this.tokens.parseRefreshToken(input.refreshToken);
    const session = await this.database.client.authSession.findUnique({
      where: { id: credential.sessionId },
      select: { id: true, refreshTokenDigest: true, revokedAt: true },
    });

    if (
      !session ||
      session.revokedAt ||
      !this.tokens.refreshSecretMatches(
        session.refreshTokenDigest,
        credential.secret,
      )
    ) {
      return;
    }

    await this.database.client.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  }

  private invalidOtp(): UnauthorizedException {
    return new UnauthorizedException("Invalid or expired verification code");
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException("Invalid refresh token");
  }

  private rateLimit(retryAfterSeconds: number): HttpException {
    return new HttpException(
      {
        code: "OTP_RATE_LIMITED",
        message: "Wait before requesting another verification code",
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
