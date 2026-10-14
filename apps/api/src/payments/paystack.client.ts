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

const refundResponseSchema = z.object({
  status: z.literal(true),
  message: z.string(),
  data: z.object({
    id: z.union([z.number().int().nonnegative(), z.string().min(1)]),
    status: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().length(3),
  }),
});

const banksResponseSchema = z.object({
  status: z.literal(true),
  data: z.array(
    z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      currency: z.string().length(3),
      active: z.boolean(),
    }),
  ),
});

const accountResolutionResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    account_number: z.string().regex(/^\d{10}$/),
    account_name: z.string().min(1),
  }),
});

const transferRecipientResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    recipient_code: z.string().min(1),
    name: z.string().min(1),
    details: z.object({
      account_number: z.string().min(4),
      account_name: z.string().min(1),
      bank_code: z.string().min(1),
      bank_name: z.string().min(1),
    }),
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

export interface CreatePaystackRefundInput {
  transactionReference: string;
  amountKobo: number;
  currency: string;
  reason: string;
}

export interface CreatedPaystackRefund {
  id: string;
  status: string;
  amountKobo: number;
  currency: string;
  message: string;
}

export interface PaystackBank {
  name: string;
  code: string;
  currency: string;
}

export interface ResolvedPaystackAccount {
  accountNumber: string;
  accountName: string;
}

export interface CreatedTransferRecipient {
  recipientCode: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

export abstract class PaystackClient {
  abstract initialize(
    input: InitializePaystackTransactionInput,
  ): Promise<InitializedPaystackTransaction>;
  abstract verify(reference: string): Promise<VerifiedPaystackTransaction>;
  abstract createRefund(
    input: CreatePaystackRefundInput,
  ): Promise<CreatedPaystackRefund>;
  abstract listBanks(): Promise<PaystackBank[]>;
  abstract resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolvedPaystackAccount>;
  abstract createTransferRecipient(input: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency: string;
    description: string;
  }): Promise<CreatedTransferRecipient>;
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

  async createRefund(
    input: CreatePaystackRefundInput,
  ): Promise<CreatedPaystackRefund> {
    const response = await this.request("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: input.transactionReference,
        amount: input.amountKobo,
        currency: input.currency,
        customer_note: input.reason,
        merchant_note: input.reason,
      }),
    });
    const parsed = refundResponseSchema.parse(response);

    return {
      id: String(parsed.data.id),
      status: parsed.data.status,
      amountKobo: parsed.data.amount,
      currency: parsed.data.currency,
      message: parsed.message,
    };
  }

  async listBanks(): Promise<PaystackBank[]> {
    const response = await this.request("/bank?country=nigeria&currency=NGN", {
      method: "GET",
    });
    const parsed = banksResponseSchema.parse(response);

    return parsed.data
      .filter((bank) => bank.active && bank.currency === "NGN")
      .map((bank) => ({
        name: bank.name,
        code: bank.code,
        currency: bank.currency,
      }));
  }

  async resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolvedPaystackAccount> {
    const query = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    });
    const response = await this.request(`/bank/resolve?${query.toString()}`, {
      method: "GET",
    });
    const parsed = accountResolutionResponseSchema.parse(response);

    return {
      accountNumber: parsed.data.account_number,
      accountName: parsed.data.account_name,
    };
  }

  async createTransferRecipient(input: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency: string;
    description: string;
  }): Promise<CreatedTransferRecipient> {
    const response = await this.request("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name: input.name,
        account_number: input.accountNumber,
        bank_code: input.bankCode,
        currency: input.currency,
        description: input.description,
      }),
    });
    const parsed = transferRecipientResponseSchema.parse(response);

    return {
      recipientCode: parsed.data.recipient_code,
      accountNumber: parsed.data.details.account_number,
      accountName: parsed.data.details.account_name,
      bankCode: parsed.data.details.bank_code,
      bankName: parsed.data.details.bank_name,
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
