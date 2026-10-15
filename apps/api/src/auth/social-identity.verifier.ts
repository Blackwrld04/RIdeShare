import type { AppConfig } from "@commuteshare/config";
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createRemoteJWKSet,
  customFetch,
  importPKCS8,
  type JWTPayload,
  jwtVerify,
  SignJWT,
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
    authorizationCode?: string,
  ): Promise<SocialIdentity>;
}

@Injectable()
export class JoseSocialIdentityVerifier extends SocialIdentityVerifier {
  private readonly googleKeys;
  private readonly appleKeys;
  private readonly fetchImplementation: typeof fetch;

  constructor(
    private readonly config: AppConfig,
    fetchImplementation: typeof fetch = fetch,
  ) {
    super();
    this.fetchImplementation = fetchImplementation;
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
    authorizationCode?: string,
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
      const payload = await this.verifyToken(provider, idToken, audiences);
      if (provider === "apple") {
        if (!authorizationCode) {
          throw new UnauthorizedException(
            "Apple authorization code is required",
          );
        }
        await this.verifyAppleAuthorizationCode(
          authorizationCode,
          payload,
          audiences,
        );
      }
      return this.identity(provider, payload);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid social identity token");
    }
  }

  private async verifyToken(
    provider: SocialProvider,
    idToken: string,
    audiences: string[],
  ): Promise<JWTPayload> {
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
    return payload;
  }

  private async verifyAppleAuthorizationCode(
    authorizationCode: string,
    identityToken: JWTPayload,
    audiences: string[],
  ): Promise<void> {
    const clientId = this.appleClientId(identityToken, audiences);
    const clientSecret = await this.appleClientSecret(clientId);
    const response = await this.fetchImplementation(
      "https://appleid.apple.com/auth/token",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: authorizationCode,
          grant_type: "authorization_code",
          redirect_uri: this.config.APPLE_REDIRECT_URI ?? "",
        }),
        signal: AbortSignal.timeout(this.config.API_REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      throw new UnauthorizedException("Invalid Apple authorization code");
    }
    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("id_token" in body) ||
      typeof body.id_token !== "string"
    ) {
      throw new UnauthorizedException("Invalid Apple authorization response");
    }
    const exchangedToken = await this.verifyToken(
      "apple",
      body.id_token,
      audiences,
    );
    if (
      exchangedToken.sub !== identityToken.sub ||
      (exchangedToken.nonce !== undefined &&
        exchangedToken.nonce !== identityToken.nonce)
    ) {
      throw new UnauthorizedException("Apple authorization did not match");
    }
  }

  private appleClientId(payload: JWTPayload, audiences: string[]): string {
    const tokenAudiences = Array.isArray(payload.aud)
      ? payload.aud
      : typeof payload.aud === "string"
        ? [payload.aud]
        : [];
    const clientId = audiences.find((audience) =>
      tokenAudiences.includes(audience),
    );
    if (!clientId) {
      throw new UnauthorizedException("Invalid Apple identity audience");
    }
    return clientId;
  }

  private async appleClientSecret(clientId: string): Promise<string> {
    const { APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_TEAM_ID } = this.config;
    if (!APPLE_KEY_ID || !APPLE_PRIVATE_KEY || !APPLE_TEAM_ID) {
      throw new ServiceUnavailableException(
        "Apple authentication is not configured",
      );
    }
    const key = await importPKCS8(
      APPLE_PRIVATE_KEY.replaceAll("\\n", "\n"),
      "ES256",
    );
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
      .setIssuer(APPLE_TEAM_ID)
      .setSubject(clientId)
      .setAudience("https://appleid.apple.com")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
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
