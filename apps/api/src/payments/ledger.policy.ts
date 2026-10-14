import {
  LedgerAccount,
  type LedgerAccount as LedgerAccountValue,
  LedgerDirection,
  type LedgerDirection as LedgerDirectionValue,
  RefundKind,
  type RefundKind as RefundKindValue,
} from "@commuteshare/database";

export interface JournalEntryInput {
  account: LedgerAccountValue;
  direction: LedgerDirectionValue;
  amountKobo: bigint;
}

export interface RefundBreakdown {
  refundAmountKobo: bigint;
  driverCompensationKobo: bigint;
}

export function assertBalancedJournal(entries: JournalEntryInput[]): void {
  if (entries.length < 2 || entries.some((entry) => entry.amountKobo <= 0n)) {
    throw new Error("Ledger journal entries must contain positive amounts");
  }

  const debitTotal = entries
    .filter((entry) => entry.direction === LedgerDirection.DEBIT)
    .reduce((total, entry) => total + entry.amountKobo, 0n);
  const creditTotal = entries
    .filter((entry) => entry.direction === LedgerDirection.CREDIT)
    .reduce((total, entry) => total + entry.amountKobo, 0n);

  if (debitTotal !== creditTotal) {
    throw new Error("Ledger journal is not balanced");
  }
}

export function escrowFundedEntries(amountKobo: bigint): JournalEntryInput[] {
  return [
    {
      account: LedgerAccount.PLATFORM_CASH,
      direction: LedgerDirection.DEBIT,
      amountKobo,
    },
    {
      account: LedgerAccount.PASSENGER_ESCROW,
      direction: LedgerDirection.CREDIT,
      amountKobo,
    },
  ];
}

export function refundReservedEntries(
  totalPaidKobo: bigint,
  refundAmountKobo: bigint,
  driverCompensationKobo: bigint,
): JournalEntryInput[] {
  const entries: JournalEntryInput[] = [
    {
      account: LedgerAccount.PASSENGER_ESCROW,
      direction: LedgerDirection.DEBIT,
      amountKobo: totalPaidKobo,
    },
    {
      account: LedgerAccount.REFUND_PAYABLE,
      direction: LedgerDirection.CREDIT,
      amountKobo: refundAmountKobo,
    },
  ];

  if (driverCompensationKobo > 0n) {
    entries.push({
      account: LedgerAccount.DRIVER_PAYABLE,
      direction: LedgerDirection.CREDIT,
      amountKobo: driverCompensationKobo,
    });
  }

  return entries;
}

export function refundSettledEntries(
  refundAmountKobo: bigint,
): JournalEntryInput[] {
  return [
    {
      account: LedgerAccount.REFUND_PAYABLE,
      direction: LedgerDirection.DEBIT,
      amountKobo: refundAmountKobo,
    },
    {
      account: LedgerAccount.PLATFORM_CASH,
      direction: LedgerDirection.CREDIT,
      amountKobo: refundAmountKobo,
    },
  ];
}

export function tripSettledEntries(
  baseAmountKobo: bigint,
  platformFeeKobo: bigint,
): JournalEntryInput[] {
  return [
    {
      account: LedgerAccount.PASSENGER_ESCROW,
      direction: LedgerDirection.DEBIT,
      amountKobo: baseAmountKobo + platformFeeKobo,
    },
    {
      account: LedgerAccount.DRIVER_PAYABLE,
      direction: LedgerDirection.CREDIT,
      amountKobo: baseAmountKobo,
    },
    {
      account: LedgerAccount.PLATFORM_REVENUE,
      direction: LedgerDirection.CREDIT,
      amountKobo: platformFeeKobo,
    },
  ];
}

export function calculateRefund(
  kind: RefundKindValue,
  baseAmountKobo: bigint,
  platformFeeKobo: bigint,
  departureAt: Date,
  now = new Date(),
): RefundBreakdown {
  if (
    kind === RefundKind.DRIVER_CANCELLATION ||
    kind === RefundKind.FULFILLMENT_FAILED ||
    departureAt.getTime() - now.getTime() >= 24 * 60 * 60 * 1_000
  ) {
    return {
      refundAmountKobo: baseAmountKobo + platformFeeKobo,
      driverCompensationKobo: 0n,
    };
  }

  const driverCompensationKobo = baseAmountKobo / 2n;
  return {
    refundAmountKobo: baseAmountKobo - driverCompensationKobo + platformFeeKobo,
    driverCompensationKobo,
  };
}
