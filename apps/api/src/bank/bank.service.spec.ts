import { BankAccountStatus } from "@commuteshare/database";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { DatabaseService } from "../infrastructure/database.service.js";
import type { PaystackClient } from "../payments/paystack.client.js";
import { BankService } from "./bank.service.js";

function fixture() {
  const account = {
    id: "bank-account-id",
    status: BankAccountStatus.VERIFIED,
    bankCode: "058",
    bankName: "GTBank",
    accountName: "ABDULQUADRI MUSA OLAJIDE",
    accountNumberLast4: "6789",
    resolvedAt: new Date("2026-10-14T12:00:00.000Z"),
    updatedAt: new Date("2026-10-14T12:00:00.000Z"),
  };
  const driverApplication = {
    findUnique: vi.fn().mockResolvedValue({
      id: "driver-id",
      legalFirstName: "Olajide",
      legalLastName: "Abdulquadri",
    }),
  };
  const driverBankAccount = {
    findFirst: vi.fn(),
    upsert: vi.fn().mockResolvedValue(account),
  };
  const database = {
    client: { driverApplication, driverBankAccount },
  } as unknown as DatabaseService;
  const paystack = {
    resolveAccount: vi.fn().mockResolvedValue({
      accountNumber: "0123456789",
      accountName: "ABDULQUADRI MUSA OLAJIDE",
    }),
    createTransferRecipient: vi.fn().mockResolvedValue({
      recipientCode: "RCP_testrecipient",
      accountNumber: "0123456789",
      accountName: "ABDULQUADRI MUSA OLAJIDE",
      bankCode: "058",
      bankName: "GTBank",
    }),
  } as unknown as PaystackClient;

  return {
    service: new BankService(database, paystack),
    driverBankAccount,
    paystack,
  };
}

describe("BankService", () => {
  it("stores only masked NUBAN details after recipient verification", async () => {
    const { service, driverBankAccount } = fixture();

    await expect(
      service.resolve("user-id", {
        accountNumber: "0123456789",
        bankCode: "058",
      }),
    ).resolves.toMatchObject({ maskedAccountNumber: "******6789" });

    const upsertInput = driverBankAccount.upsert.mock.calls[0]?.[0];
    expect(upsertInput).toMatchObject({
      create: {
        accountNumberLast4: "6789",
        providerRecipientCode: "RCP_testrecipient",
      },
    });
    expect(JSON.stringify(upsertInput)).not.toContain("0123456789");
  });

  it("rejects a resolved account with a different legal owner", async () => {
    const { service, driverBankAccount, paystack } = fixture();
    vi.mocked(paystack.resolveAccount).mockResolvedValue({
      accountNumber: "0123456789",
      accountName: "ANOTHER PERSON",
    });

    await expect(
      service.resolve("user-id", {
        accountNumber: "0123456789",
        bankCode: "058",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(paystack.createTransferRecipient).not.toHaveBeenCalled();
    expect(driverBankAccount.upsert).not.toHaveBeenCalled();
  });
});
