import type { AppConfig } from "@commuteshare/config";
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createRemoteJWKSet,
  customFetch,
  type JWTPayload,
  jwtVerify,
} from "jose";
import type { SocialProvider } from "./auth.schemas.js";

export interface SocialIdentity {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  displayName: string | null;
  nonce: string;
}

export abstract class SocialIdentityVerifier {
  abstract verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<SocialIdentity>;
}

@Injectable()
export class JoseSocialIdentityVerifier extends SocialIdentityVerifier {
  private readonly googleKeys;
  private readonly appleKeys;

  constructor(
    private readonly config: AppConfig,
    fetchImplementation: typeof fetch = fetch,
  ) {
    super();
    const options = { [customFetch]: fetchImplementation };
    this.googleKeys = createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs"),
      options,
    );
    this.appleKeys = createRemoteJWKSet(
      new URL("https://appleid.apple.com/auth/keys"),
      options,
    );
  }

  async verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<SocialIdentity> {
    const audiences =
      provider === "google"
        ? this.config.GOOGLE_OIDC_CLIENT_IDS
        : this.config.APPLE_OIDC_CLIENT_IDS;
    if (audiences.length === 0) {
      throw new ServiceUnavailableException(
        `${provider} authentication is not configured`,
      );
    }

    try {
      const { payload } = await jwtVerify(
        idToken,
        provider === "google" ? this.googleKeys : this.appleKeys,
        {
          issuer:
            provider === "google"
              ? ["https://accounts.google.com", "accounts.google.com"]
              : "https://appleid.apple.com",
          audience: audiences,
          algorithms: ["RS256"],
        },
      );
      return this.identity(provider, payload);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid social identity token");
    }
  }

  private identity(
    provider: SocialProvider,
    payload: JWTPayload,
  ): SocialIdentity {
    if (typeof payload.sub !== "string" || typeof payload.nonce !== "string") {
      throw new UnauthorizedException("Social identity token is incomplete");
    }
    if (
      provider === "google" &&
      payload.email !== undefined &&
      payload.email_verified !== true
    ) {
      throw new UnauthorizedException("Social identity email is not verified");
    }
    return {
      provider,
      subject: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      displayName: typeof payload.name === "string" ? payload.name : null,
      nonce: payload.nonce,
    };
  }
}
