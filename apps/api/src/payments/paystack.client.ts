import type { AppConfig } from "@commuteshare/config";
import { z } from "zod";

const initializeResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    authorization_url: z.url(),
    access_code: z.string().min(1),
    reference: z.string().min(1),
  }),
});

const verifyResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.union([z.number().int().nonnegative(), z.string().min(1)]),
    status: z.string().min(1),
    reference: z.string().min(1),
    amount: z.number().int().nonnegative(),
    currency: z.string().length(3),
    paid_at: z.string().nullable().optional(),
  }),
});

export interface InitializePaystackTransactionInput {
  email: string;
  amountKobo: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

export interface InitializedPaystackTransaction {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifiedPaystackTransaction {
  id: string;
  status: string;
  reference: string;
  amountKobo: number;
  currency: string;
  paidAt: Date | null;
}

export abstract class PaystackClient {
  abstract initialize(
    input: InitializePaystackTransactionInput,
  ): Promise<InitializedPaystackTransaction>;
  abstract verify(reference: string): Promise<VerifiedPaystackTransaction>;
}

export class HttpPaystackClient extends PaystackClient {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {
    super();
  }

  async initialize(
    input: InitializePaystackTransactionInput,
  ): Promise<InitializedPaystackTransaction> {
    const response = await this.request("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: String(input.amountKobo),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: ["card", "bank", "ussd", "bank_transfer"],
        metadata: JSON.stringify(input.metadata),
      }),
    });
    const parsed = initializeResponseSchema.parse(response);

    return {
      authorizationUrl: parsed.data.authorization_url,
      accessCode: parsed.data.access_code,
      reference: parsed.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifiedPaystackTransaction> {
    const response = await this.request(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET" },
    );
    const parsed = verifyResponseSchema.parse(response);

    return {
      id: String(parsed.data.id),
      status: parsed.data.status,
      reference: parsed.data.reference,
      amountKobo: parsed.data.amount,
      currency: parsed.data.currency,
      paidAt: parsed.data.paid_at ? new Date(parsed.data.paid_at) : null,
    };
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetchImplementation(
      new URL(path, this.config.PAYSTACK_BASE_URL),
      {
        ...init,
        headers: {
          authorization: `Bearer ${this.config.PAYSTACK_SECRET_KEY}`,
          "content-type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Paystack request failed with ${response.status}`);
    }

    return response.json();
  }
}
