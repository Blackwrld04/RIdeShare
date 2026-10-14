import type { LedgerJournalKind, Prisma } from "@commuteshare/database";
import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service.js";
import {
  assertBalancedJournal,
  type JournalEntryInput,
} from "./ledger.policy.js";

export interface CreateJournalInput {
  bookingId: string;
  paymentId?: string;
  refundId?: string;
  userId?: string;
  kind: LedgerJournalKind;
  idempotencyKey: string;
  currency: string;
  entries: JournalEntryInput[];
}

export interface LedgerJournalResponse {
  id: string;
  bookingId: string;
  kind: string;
  currency: string;
  entries: Array<{
    account: string;
    direction: string;
    amountKobo: number;
  }>;
  createdAt: string;
}

@Injectable()
export class LedgerService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async createJournal(
    transaction: Prisma.TransactionClient,
    input: CreateJournalInput,
  ): Promise<void> {
    assertBalancedJournal(input.entries);
    const existing = await transaction.ledgerJournal.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    await transaction.ledgerJournal.create({
      data: {
        bookingId: input.bookingId,
        kind: input.kind,
        idempotencyKey: input.idempotencyKey,
        currency: input.currency,
        ...(input.paymentId ? { paymentId: input.paymentId } : {}),
        ...(input.refundId ? { refundId: input.refundId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        entries: { create: input.entries },
      },
    });
  }

  async getMine(userId: string): Promise<LedgerJournalResponse[]> {
    const journals = await this.database.client.ledgerJournal.findMany({
      where: {
        booking: {
          OR: [
            { passengerUserId: userId },
            { rideOffer: { driverApplication: { userId } } },
          ],
        },
      },
      include: { entries: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return journals.map((journal) => ({
      id: journal.id,
      bookingId: journal.bookingId,
      kind: journal.kind,
      currency: journal.currency,
      entries: journal.entries.map((entry) => ({
        account: entry.account,
        direction: entry.direction,
        amountKobo: Number(entry.amountKobo),
      })),
      createdAt: journal.createdAt.toISOString(),
    }));
  }
}
