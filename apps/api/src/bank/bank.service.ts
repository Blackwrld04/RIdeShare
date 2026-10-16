import { BankAccountStatus } from "@commuteshare/database";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import { PaystackClient } from "../payments/paystack.client.js";
import { doesAccountNameMatch } from "./bank.policy.js";
import type { ResolveBankAccountInput } from "./bank.schemas.js";

export interface BankResponse {
  name: string;
  code: string;
  currency: string;
}

export interface BankAccountResponse {
  id: string;
  status: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  maskedAccountNumber: string;
  resolvedAt: string;
  updatedAt: string;
}

@Injectable()
export class BankService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaystackClient) private readonly paystack: PaystackClient,
  ) {}

  async listBanks(): Promise<BankResponse[]> {
    return this.paystack.listBanks();
  }

  async getMine(userId: string): Promise<BankAccountResponse | null> {
    const account = await this.database.client.driverBankAccount.findFirst({
      where: { application: { userId } },
    });

    return account ? this.toResponse(account) : null;
  }

  async resolve(
    userId: string,
    input: ResolveBankAccountInput,
  ): Promise<BankAccountResponse> {
    const application = await this.database.client.driverApplication.findUnique(
      {
        where: { userId },
        select: {
          id: true,
          legalFirstName: true,
          legalLastName: true,
        },
      },
    );

    if (!application) {
      throw new NotFoundException("Driver application not found");
    }
    if (!application.legalFirstName || !application.legalLastName) {
      throw new BadRequestException(
        "Complete legal driver details before adding a bank account",
      );
    }

    const resolved = await this.paystack.resolveAccount(
      input.accountNumber,
      input.bankCode,
    );

    if (
      resolved.accountNumber !== input.accountNumber ||
      !doesAccountNameMatch(
        application.legalFirstName,
        application.legalLastName,
        resolved.accountName,
      )
    ) {
      throw new BadRequestException(
        "Bank account name does not match driver legal details",
      );
    }

    const recipient = await this.paystack.createTransferRecipient({
      name: resolved.accountName,
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      currency: "NGN",
      description: "RideShare driver payout",
    });

    if (
      recipient.accountNumber !== input.accountNumber ||
      recipient.bankCode !== input.bankCode ||
      !doesAccountNameMatch(
        application.legalFirstName,
        application.legalLastName,
        recipient.accountName,
      )
    ) {
      throw new BadRequestException(
        "Paystack recipient did not match the resolved account",
      );
    }

    const resolvedAt = new Date();
    const account = await this.database.client.driverBankAccount.upsert({
      where: { driverApplicationId: application.id },
      create: {
        driverApplicationId: application.id,
        bankCode: recipient.bankCode,
        bankName: recipient.bankName,
        accountName: recipient.accountName,
        accountNumberLast4: input.accountNumber.slice(-4),
        providerRecipientCode: recipient.recipientCode,
        resolvedAt,
      },
      update: {
        status: BankAccountStatus.VERIFIED,
        bankCode: recipient.bankCode,
        bankName: recipient.bankName,
        accountName: recipient.accountName,
        accountNumberLast4: input.accountNumber.slice(-4),
        providerRecipientCode: recipient.recipientCode,
        resolvedAt,
      },
    });

    return this.toResponse(account);
  }

  private toResponse(account: {
    id: string;
    status: BankAccountStatus;
    bankCode: string;
    bankName: string;
    accountName: string;
    accountNumberLast4: string;
    resolvedAt: Date;
    updatedAt: Date;
  }): BankAccountResponse {
    return {
      id: account.id,
      status: account.status,
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountName: account.accountName,
      maskedAccountNumber: `******${account.accountNumberLast4}`,
      resolvedAt: account.resolvedAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }
}
