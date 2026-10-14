import type { AppConfig } from "@commuteshare/config";
import { z } from "zod";

const transferResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    amount: z.number().int().positive(),
    currency: z.string().length(3),
    reference: z.string().min(1),
    status: z.string().min(1),
    transfer_code: z.string().min(1),
  }),
});

export interface TransferResult {
  amountKobo: number;
  currency: string;
  reference: string;
  status: string;
  transferCode: string;
  message: string;
}

export class PaystackTransferClient {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async initiate(input: {
    amountKobo: number;
    currency: string;
    recipientCode: string;
    reference: string;
    reason: string;
  }): Promise<TransferResult> {
    return this.request("/transfer", {
      method: "POST",
      body: JSON.stringify({
        source: "balance",
        amount: input.amountKobo,
        recipient: input.recipientCode,
        reference: input.reference,
        reason: input.reason,
        currency: input.currency,
      }),
    });
  }

  async verify(reference: string): Promise<TransferResult> {
    return this.request(`/transfer/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
    });
  }

  private async request(
    path: string,
    init: RequestInit,
  ): Promise<TransferResult> {
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
      throw new Error(
        `Paystack transfer request failed with ${response.status}`,
      );
    }

    const parsed = transferResponseSchema.parse(await response.json());
    return {
      amountKobo: parsed.data.amount,
      currency: parsed.data.currency,
      reference: parsed.data.reference,
      status: parsed.data.status,
      transferCode: parsed.data.transfer_code,
      message: parsed.message,
    };
  }
}
