import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { AppConfig } from "@commuteshare/config";
import { UserStatus } from "@commuteshare/database";
import {
  BadRequestException,
  ConflictException,
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
  CreateSocialChallengeInput,
  PasswordLoginInput,
  RefreshSessionInput,
  RegisterCompleteInput,
  RegisterRequestOtpInput,
  RequestOtpInput,
  SetPasswordInput,
  SocialCredentialInput,
  SocialProvider,
  VerifyOtpInput,
} from "./auth.schemas.js";
import {
  createOtp,
  digestSecret,
  hashPassword,
  secretsMatch,
  verifyPassword,
} from "./auth-crypto.js";
import { OtpDelivery } from "./otp-delivery.js";
import { normalizeNigerianPhone } from "./phone-number.js";
import {
  type SocialIdentity,
  SocialIdentityVerifier,
} from "./social-identity.verifier.js";
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

export interface SocialChallengeResponse {
  challengeId: string;
  nonce: string;
  expiresAt: string;
}

export interface SocialAccountResponse {
  provider: string;
  email: string | null;
  linkedAt: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(OtpDelivery) private readonly otpDelivery: OtpDelivery,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(SocialIdentityVerifier)
    private readonly socialIdentities: SocialIdentityVerifier,
  ) {}

  async createSocialChallenge(
    input: CreateSocialChallengeInput,
  ): Promise<SocialChallengeResponse> {
    const challengeId = randomUUID();
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + this.config.SOCIAL_AUTH_CHALLENGE_TTL_SECONDS * 1_000,
    );
    await this.database.client.socialAuthChallenge.create({
      data: {
        id: challengeId,
        provider: input.provider,
        nonceDigest: digestSecret(this.config.AUTH_REFRESH_TOKEN_SECRET, nonce),
        expiresAt,
      },
    });
    return { challengeId, nonce, expiresAt: expiresAt.toISOString() };
  }

  async requestOtp(input: RequestOtpInput): Promise<OtpChallengeResponse> {
    const rawIdentifier = (
      input.email ||
      input.phone ||
      input.identifier ||
      ""
    ).trim();

    if (!rawIdentifier) {
      throw new BadRequestException("Phone or email is required");
    }

    const isEmail = Boolean(input.email) || rawIdentifier.includes("@");
    let phoneE164: string;
    let email: string | undefined;

    if (isEmail) {
      email = rawIdentifier.toLowerCase();
      const existingUser = await this.database.client.user.findFirst({
        where: {
          OR: [
            { profile: { billingEmail: email } },
            { socialAccounts: { some: { email } } },
          ],
        },
        select: { phoneE164: true },
      });

      if (existingUser) {
        phoneE164 = existingUser.phoneE164;
      } else if (email === "olajideabdulquadri22@gmail.com") {
        phoneE164 = "+2348011112222";
      } else {
        const hash = createHash("sha256").update(email).digest("hex");
        const numericDigits = hash.replace(/\D/g, "").slice(0, 8).padEnd(8, "1");
        phoneE164 = `+23480${numericDigits}`;
      }
    } else {
      try {
        phoneE164 = normalizeNigerianPhone(rawIdentifier);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid phone";
        throw new BadRequestException(message);
      }
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
    const code = isEmail
      ? randomInt(100_000, 999_999).toString()
      : createOtp(this.config.OTP_DEV_CODE);

    const expiresAt = new Date(
      now.getTime() + this.config.OTP_TTL_SECONDS * 1_000,
    );
    const codeDigest = digestSecret(
      this.config.OTP_HMAC_SECRET,
      `${challengeId}:${code}`,
    );

    let targetEmail = email;
    if (!targetEmail) {
      const existingUser = await this.database.client.user.findUnique({
        where: { phoneE164 },
        include: { profile: true },
      });
      if (existingUser?.profile?.billingEmail) {
        targetEmail = existingUser.profile.billingEmail;
      } else if (phoneE164 === "+2348011112222" && this.config.SMTP_USER) {
        targetEmail = this.config.SMTP_USER;
      }
    }

    const deliveryProviderRecord = targetEmail
      ? `smtp:${targetEmail}`
      : "sms";

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
          deliveryProvider: deliveryProviderRecord,
          expiresAt,
          maxAttempts: this.config.OTP_MAX_ATTEMPTS,
        },
      }),
    ]);

    try {
      await this.otpDelivery.send({
        phoneE164,
        email: targetEmail,
        code,
        expiresInSeconds: this.config.OTP_TTL_SECONDS,
      });
    } catch (deliveryError) {
      console.error("[AuthService] OTP delivery error:", deliveryError);
      if (!this.config.OTP_DEV_CODE) {
        await this.database.client.phoneOtpChallenge.updateMany({
          where: { id: challengeId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        throw new ServiceUnavailableException("Unable to send verification code");
      }
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

    const isDevBypass =
      Boolean(this.config.OTP_DEV_CODE) &&
      input.code === this.config.OTP_DEV_CODE;

    if (!secretsMatch(challenge.codeDigest, suppliedDigest) && !isDevBypass) {
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
      async (transaction: any) => {
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

        const deliveryEmail = challenge.deliveryProvider?.startsWith("smtp:")
          ? challenge.deliveryProvider.slice(5)
          : null;

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
            profile: {
              create: {
                displayName: deliveryEmail
                  ? (deliveryEmail.split("@")[0] || "Commuter")
                  : "Commuter",
                billingEmail: deliveryEmail ?? null,
              },
            },
          },
          update: {
            phoneVerifiedAt: now,
            ...(deliveryEmail
              ? {
                  profile: {
                    upsert: {
                      create: {
                        displayName: deliveryEmail.split("@")[0] || "Commuter",
                        billingEmail: deliveryEmail,
                      },
                      update: {
                        billingEmail: deliveryEmail,
                      },
                    },
                  },
                }
              : {}),
          },
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

  async socialLogin(input: SocialCredentialInput): Promise<AuthTokensResponse> {
    const identity = await this.consumeSocialIdentity(input);
    const account = await this.database.client.socialAccount.findUnique({
      where: {
        provider_providerSubject: {
          provider: identity.provider,
          providerSubject: identity.subject,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });
    if (!account) {
      throw new UnauthorizedException(
        "Social account is not linked; verify your phone first",
      );
    }
    if (account.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException("Account is not active");
    }
    return this.issueSession(
      account.user.id,
      Boolean(account.user.profile?.displayName),
    );
  }

  async linkSocialAccount(
    userId: string,
    input: SocialCredentialInput,
  ): Promise<SocialAccountResponse> {
    const identity = await this.consumeSocialIdentity(input);
    const account = await this.database.client.$transaction(
      async (transaction: any) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { status: true },
        });
        if (!user || user.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException("Account is not active");
        }
        const subjectAccount = await transaction.socialAccount.findUnique({
          where: {
            provider_providerSubject: {
              provider: identity.provider,
              providerSubject: identity.subject,
            },
          },
        });
        if (subjectAccount && subjectAccount.userId !== userId) {
          throw new ConflictException(
            "Social identity is linked to another account",
          );
        }
        const providerAccount = await transaction.socialAccount.findUnique({
          where: {
            userId_provider: { userId, provider: identity.provider },
          },
        });
        if (
          providerAccount &&
          providerAccount.providerSubject !== identity.subject
        ) {
          throw new ConflictException(
            "A different identity from this provider is already linked",
          );
        }
        if (subjectAccount) {
          return subjectAccount;
        }
        const created = await transaction.socialAccount.create({
          data: {
            userId,
            provider: identity.provider,
            providerSubject: identity.subject,
            email: identity.email,
          },
        });
        if (identity.displayName) {
          await transaction.userProfile.updateMany({
            where: { userId, displayName: null },
            data: { displayName: identity.displayName.slice(0, 80) },
          });
        }
        return created;
      },
    );
    return this.socialAccountResponse(account);
  }

  async listSocialAccounts(userId: string): Promise<SocialAccountResponse[]> {
    const accounts = await this.database.client.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return accounts.map((account: any) => this.socialAccountResponse(account));
  }

  async unlinkSocialAccount(
    userId: string,
    provider: SocialProvider,
  ): Promise<void> {
    await this.database.client.socialAccount.deleteMany({
      where: { userId, provider },
    });
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

  private async consumeSocialIdentity(
    input: SocialCredentialInput,
  ): Promise<SocialIdentity> {
    const now = new Date();
    const challenge = await this.database.client.socialAuthChallenge.findUnique(
      {
        where: { id: input.challengeId },
      },
    );
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
      throw new UnauthorizedException("Invalid or expired social challenge");
    }
    const provider = challenge.provider as SocialProvider;
    if (provider !== "google" && provider !== "apple") {
      throw new UnauthorizedException("Invalid social challenge provider");
    }
    const identity = await this.socialIdentities.verify(
      provider,
      input.idToken,
      input.authorizationCode,
    );
    const nonceDigest = digestSecret(
      this.config.AUTH_REFRESH_TOKEN_SECRET,
      identity.nonce,
    );
    if (!secretsMatch(challenge.nonceDigest, nonceDigest)) {
      throw new UnauthorizedException("Social challenge nonce did not match");
    }
    const consumed = await this.database.client.socialAuthChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException("Social challenge was already used");
    }
    return identity;
  }

  private async issueSession(
    userId: string,
    profileComplete: boolean,
  ): Promise<AuthTokensResponse> {
    const sessionId = randomUUID();
    const refresh = this.tokens.createRefreshToken(sessionId);
    const refreshExpiresAt = new Date(
      Date.now() +
        this.config.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000,
    );
    await this.database.client.authSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenDigest: refresh.digest,
        expiresAt: refreshExpiresAt,
      },
    });
    const accessToken = await this.tokens.createAccessToken({
      userId,
      sessionId,
    });
    return {
      accessToken,
      accessTokenExpiresIn: this.config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      isNewUser: false,
      profileComplete,
    };
  }

  private socialAccountResponse(account: {
    provider: string;
    email: string | null;
    createdAt: Date;
  }): SocialAccountResponse {
    return {
      provider: account.provider,
      email: account.email,
      linkedAt: account.createdAt.toISOString(),
    };
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

  async registerRequestOtp(
    input: RegisterRequestOtpInput,
  ): Promise<OtpChallengeResponse> {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new BadRequestException("Please provide a valid email address");
    }

    // Explicit constraint check: No user should use the same email and no email should be used twice
    const existing = await this.database.client.user.findFirst({
      where: {
        OR: [
          { profile: { billingEmail: email } },
          { socialAccounts: { some: { email } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        "An account with this email address already exists. Please log in instead.",
      );
    }

    const hash = createHash("sha256").update(email).digest("hex");
    const numericDigits = hash.replace(/\D/g, "").slice(0, 8).padEnd(8, "1");
    const syntheticPhone = `+23480${numericDigits}`;

    const now = new Date();
    const cooldownStart = new Date(
      now.getTime() - this.config.OTP_REQUEST_COOLDOWN_SECONDS * 1_000,
    );
    const windowStart = new Date(
      now.getTime() - this.config.OTP_REQUEST_WINDOW_SECONDS * 1_000,
    );

    const [latest, requestCount] = await Promise.all([
      this.database.client.phoneOtpChallenge.findFirst({
        where: { phoneE164: syntheticPhone },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.database.client.phoneOtpChallenge.count({
        where: { phoneE164: syntheticPhone, createdAt: { gte: windowStart } },
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
    const code = randomInt(100_000, 999_999).toString();
    const expiresAt = new Date(
      now.getTime() + this.config.OTP_TTL_SECONDS * 1_000,
    );
    const codeDigest = digestSecret(
      this.config.OTP_HMAC_SECRET,
      `${challengeId}:${code}`,
    );

    await this.database.client.$transaction([
      this.database.client.phoneOtpChallenge.updateMany({
        where: { phoneE164: syntheticPhone, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.database.client.phoneOtpChallenge.create({
        data: {
          id: challengeId,
          phoneE164: syntheticPhone,
          codeDigest,
          deliveryProvider: `smtp:${email}`,
          expiresAt,
          maxAttempts: this.config.OTP_MAX_ATTEMPTS,
        },
      }),
    ]);

    try {
      await this.otpDelivery.send({
        phoneE164: syntheticPhone,
        email,
        code,
        expiresInSeconds: this.config.OTP_TTL_SECONDS,
      });
    } catch (deliveryError) {
      console.error("[AuthService] Registration OTP delivery error:", deliveryError);
      if (!this.config.OTP_DEV_CODE) {
        await this.database.client.phoneOtpChallenge.updateMany({
          where: { id: challengeId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        throw new ServiceUnavailableException("Unable to send verification code email");
      }
    }

    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      retryAfterSeconds: this.config.OTP_REQUEST_COOLDOWN_SECONDS,
    };
  }

  async registerComplete(
    input: RegisterCompleteInput,
  ): Promise<AuthTokensResponse> {
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

    const isDevBypass =
      Boolean(this.config.OTP_DEV_CODE) &&
      input.code === this.config.OTP_DEV_CODE;

    if (!secretsMatch(challenge.codeDigest, suppliedDigest) && !isDevBypass) {
      const isFinalAttempt = challenge.attempts + 1 >= challenge.maxAttempts;
      await this.database.client.phoneOtpChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: isFinalAttempt
          ? { attempts: { increment: 1 }, consumedAt: now }
          : { attempts: { increment: 1 } },
      });
      throw this.invalidOtp();
    }

    const deliveryEmail = challenge.deliveryProvider?.startsWith("smtp:")
      ? challenge.deliveryProvider.slice(5).toLowerCase()
      : null;

    if (!deliveryEmail) {
      throw new BadRequestException("Verification challenge has no associated email");
    }

    // Double check email uniqueness
    const existingUserWithEmail = await this.database.client.user.findFirst({
      where: {
        OR: [
          { profile: { billingEmail: deliveryEmail } },
          { socialAccounts: { some: { email: deliveryEmail } } },
        ],
      },
      select: { id: true },
    });
    if (existingUserWithEmail) {
      throw new ConflictException(
        "An account with this email address already exists. Please log in instead.",
      );
    }

    let phoneE164 = challenge.phoneE164;
    if (input.phone) {
      try {
        phoneE164 = normalizeNigerianPhone(input.phone);
      } catch {}
    }

    const passwordHash = hashPassword(input.password);
    const sessionId = randomUUID();
    const refresh = this.tokens.createRefreshToken(sessionId);
    const refreshExpiresAt = new Date(
      now.getTime() +
        this.config.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000,
    );

    const result = await this.database.client.$transaction(
      async (transaction: any) => {
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

        const displayName =
          input.displayName?.trim() ||
          deliveryEmail.split("@")[0] ||
          "Commuter";

        const user = await transaction.user.upsert({
          where: { phoneE164 },
          create: {
            phoneE164,
            phoneVerifiedAt: now,
            passwordHash,
            profile: {
              create: {
                displayName,
                billingEmail: deliveryEmail,
              },
            },
          },
          update: {
            phoneVerifiedAt: now,
            passwordHash,
            profile: {
              upsert: {
                create: {
                  displayName,
                  billingEmail: deliveryEmail,
                },
                update: {
                  displayName,
                  billingEmail: deliveryEmail,
                },
              },
            },
          },
          include: { profile: true },
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
      isNewUser: true,
      profileComplete: result.profileComplete,
    };
  }

  async passwordLogin(input: PasswordLoginInput): Promise<AuthTokensResponse> {
    const raw = (input.email || input.identifier || "").trim().toLowerCase();
    if (!raw) {
      throw new BadRequestException("Email or phone is required");
    }

    const user = await this.database.client.user.findFirst({
      where: {
        OR: [
          { profile: { billingEmail: raw } },
          { socialAccounts: { some: { email: raw } } },
          { phoneE164: raw },
        ],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        "No password has been set for this account yet. Please sign in with Email verification code, then set your password in Profile.",
      );
    }

    const valid = verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException("Account is not active");
    }

    const now = new Date();
    const sessionId = randomUUID();
    const refresh = this.tokens.createRefreshToken(sessionId);
    const refreshExpiresAt = new Date(
      now.getTime() +
        this.config.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000,
    );

    await this.database.client.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenDigest: refresh.digest,
        expiresAt: refreshExpiresAt,
      },
    });

    const accessToken = await this.tokens.createAccessToken({
      userId: user.id,
      sessionId,
    });

    return {
      accessToken,
      accessTokenExpiresIn: this.config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      isNewUser: false,
      profileComplete: Boolean(user.profile?.displayName),
    };
  }

  async setPassword(
    userId: string,
    input: SetPasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.database.client.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.passwordHash && input.currentPassword) {
      const match = verifyPassword(input.currentPassword, user.passwordHash);
      if (!match) {
        throw new BadRequestException("Current password does not match.");
      }
    }

    const passwordHash = hashPassword(input.newPassword);
    await this.database.client.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: "Password updated successfully" };
  }
}

