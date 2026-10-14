import type { AppConfig } from "@commuteshare/config";
import { z } from "zod";

const sessionResponseSchema = z.object({
  token: z.string().min(1),
  expiry: z.iso.datetime({ offset: true }),
});

const verifyResponseSchema = z.union([
  z
    .object({
      found: z.boolean(),
      verified: z.boolean().optional().default(false),
      mismatches: z.array(z.string()).optional().default([]),
    })
    .passthrough(),
  z
    .object({
      status: z.literal("not_found"),
      data: z.null(),
    })
    .passthrough(),
]);

export interface VerifyNinProviderInput {
  nin: string;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  reference: string;
}

export interface VerifyNinProviderResult {
  found: boolean;
  verified: boolean;
  mismatches: string[];
}

export abstract class NinProvider {
  abstract verify(
    input: VerifyNinProviderInput,
  ): Promise<VerifyNinProviderResult>;
}

export class HttpNinjaNinProvider extends NinProvider {
  private session: { token: string; expiresAt: number } | null = null;
  private sessionRequest: Promise<string> | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {
    super();
  }

  async verify(
    input: VerifyNinProviderInput,
  ): Promise<VerifyNinProviderResult> {
    const token = await this.getSessionToken();
    const response = await this.fetchImplementation(
      new URL("/api/identity/identify", this.config.NINJA_BASE_URL),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idType: "nin",
          mode: "verify",
          idNumber: input.nin,
          firstName: input.legalFirstName,
          lastName: input.legalLastName,
          dateOfBirth: input.dateOfBirth,
          reference: input.reference,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Ninja verification failed with ${response.status}`);
    }

    const parsed = verifyResponseSchema.parse(await response.json());

    if ("status" in parsed) {
      return { found: false, verified: false, mismatches: [] };
    }

    return {
      found: parsed.found,
      verified: parsed.verified,
      mismatches: parsed.mismatches,
    };
  }

  private async getSessionToken(): Promise<string> {
    if (this.session && this.session.expiresAt > Date.now() + 30_000) {
      return this.session.token;
    }

    if (!this.sessionRequest) {
      this.sessionRequest = this.createSession().finally(() => {
        this.sessionRequest = null;
      });
    }

    return this.sessionRequest;
  }

  private async createSession(): Promise<string> {
    const response = await this.fetchImplementation(
      new URL("/auth/session", this.config.NINJA_BASE_URL),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_key: this.config.NINJA_CLIENT_KEY,
          client_secret: this.config.NINJA_CLIENT_SECRET,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Ninja authentication failed with ${response.status}`);
    }

    const parsed = sessionResponseSchema.parse(await response.json());
    this.session = {
      token: parsed.token,
      expiresAt: new Date(parsed.expiry).getTime(),
    };

    return parsed.token;
  }
}
