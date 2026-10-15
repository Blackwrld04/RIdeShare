import { LedgerDirection, RefundKind } from "@commuteshare/database";
import { describe, expect, it } from "vitest";
import {
  assertBalancedJournal,
  calculateRefund,
  disputeRefundReservedEntries,
  escrowFundedEntries,
  payoutReversedEntries,
  payoutSettledEntries,
  refundReservedEntries,
  refundSettledEntries,
  tripSettledEntries,
} from "./ledger.policy.js";

describe("ledger policy", () => {
  it.each(
    [
      escrowFundedEntries(230_000n),
      payoutSettledEntries(200_000n),
      payoutReversedEntries(200_000n),
      refundReservedEntries(230_000n, 130_000n, 100_000n),
      refundSettledEntries(130_000n),
      tripSettledEntries(200_000n, 30_000n),
      disputeRefundReservedEntries(200_000n, 30_000n),
    ].map((entries) => ({ entries })),
  )("builds a balanced journal", ({ entries }) => {
    expect(() => assertBalancedJournal(entries)).not.toThrow();
  });

  it("rejects an unbalanced journal", () => {
    expect(() =>
      assertBalancedJournal([
        {
          account: "PLATFORM_CASH",
          direction: LedgerDirection.DEBIT,
          amountKobo: 2n,
        },
        {
          account: "PASSENGER_ESCROW",
          direction: LedgerDirection.CREDIT,
          amountKobo: 1n,
        },
      ]),
    ).toThrow("not balanced");
  });

  it("fully refunds driver cancellations and early cancellations", () => {
    const departureAt = new Date("2026-10-16T12:00:00.000Z");
    const now = new Date("2026-10-14T12:00:00.000Z");

    expect(
      calculateRefund(
        RefundKind.PASSENGER_CANCELLATION,
        200_000n,
        30_000n,
        departureAt,
        now,
      ),
    ).toEqual({
      refundAmountKobo: 230_000n,
      driverCompensationKobo: 0n,
    });
    expect(
      calculateRefund(
        RefundKind.DRIVER_CANCELLATION,
        200_000n,
        30_000n,
        new Date("2026-10-14T13:00:00.000Z"),
        now,
      ),
    ).toEqual({
      refundAmountKobo: 230_000n,
      driverCompensationKobo: 0n,
    });
  });

  it("retains half the base amount for a late passenger cancellation", () => {
    expect(
      calculateRefund(
        RefundKind.PASSENGER_CANCELLATION,
        200_000n,
        30_000n,
        new Date("2026-10-14T20:00:00.000Z"),
        new Date("2026-10-14T12:00:00.000Z"),
      ),
    ).toEqual({
      refundAmountKobo: 130_000n,
      driverCompensationKobo: 100_000n,
    });
  });

  it("fully refunds a resolved dispute", () => {
    expect(
      calculateRefund(
        RefundKind.DISPUTE_RESOLUTION,
        200_000n,
        30_000n,
        new Date("2026-10-14T08:00:00.000Z"),
        new Date("2026-10-15T08:00:00.000Z"),
      ),
    ).toEqual({
      refundAmountKobo: 230_000n,
      driverCompensationKobo: 0n,
    });
  });
});
