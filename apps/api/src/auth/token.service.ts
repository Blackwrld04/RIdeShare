import type { AppConfig } from "@commuteshare/config";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify, SignJWT } from "jose";
import { APP_CONFIG } from "../config.provider.js";
import {
  createRefreshSecret,
  digestSecret,
  secretsMatch,
} from "./auth-crypto.js";

export interface AccessIdentity {
  userId: string;
  sessionId: string;
}

export interface RefreshCredential {
  sessionId: string;
  secret: string;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.accessSecret = new TextEncoder().encode(
      config.AUTH_ACCESS_TOKEN_SECRET,
    );
  }

  async createAccessToken(identity: AccessIdentity): Promise<string> {
    return new SignJWT({ sid: identity.sessionId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(identity.userId)
      .setIssuer("commuteshare-api")
      .setAudience("commuteshare-client")
      .setIssuedAt()
      .setExpirationTime(
        Math.floor(Date.now() / 1_000) +
          this.config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      )
      .sign(this.accessSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessIdentity> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret, {
        issuer: "commuteshare-api",
        audience: "commuteshare-client",
        algorithms: ["HS256"],
      });

      if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
        throw new UnauthorizedException("Invalid access token");
      }

      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }

  createRefreshToken(sessionId: string): {
    token: string;
    digest: string;
  } {
    const secret = createRefreshSecret();

    return {
      token: `${sessionId}.${secret}`,
      digest: this.digestRefreshSecret(secret),
    };
  }

  parseRefreshToken(token: string): RefreshCredential {
    const separator = token.indexOf(".");

    if (separator < 1 || separator === token.length - 1) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return {
      sessionId: token.slice(0, separator),
      secret: token.slice(separator + 1),
    };
  }

  refreshSecretMatches(expectedDigest: string, secret: string): boolean {
    return secretsMatch(expectedDigest, this.digestRefreshSecret(secret));
  }

  private digestRefreshSecret(secret: string): string {
    return digestSecret(this.config.AUTH_REFRESH_TOKEN_SECRET, secret);
  }
}
