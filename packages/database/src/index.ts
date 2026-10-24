import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

export {
  BankAccountStatus,
  BookingStatus,
  DriverApplicationStatus,
  DriverDocumentStatus,
  IdentityVerificationStatus,
  LedgerAccount,
  LedgerDirection,
  LedgerJournalKind,
  PaymentDisputeStatus,
  PaymentProvider,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  PrismaClient,
  ProfileGender,
  PushDeliveryStatus,
  RefundKind,
  RefundStatus,
  RidePointKind,
  RideSeriesStatus,
  RideStatus,
  UploadStatus,
  UserReportCategory,
  UserReportStatus,
  UserRole,
  UserStatus,
} from "./generated/prisma/client.js";

export interface Database {
  client: PrismaClient;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string): Database {
  let isLocal = false;
  try {
    const url = new URL(connectionString);
    isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      !url.hostname.includes(".");
  } catch {
    isLocal = false;
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    query_timeout: 10_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  return {
    client,
    close: async () => {
      await client.$disconnect();
      await pool.end();
    },
  };
}

export async function checkDatabase(database: Database): Promise<void> {
  await database.client.$queryRaw`SELECT 1`;
}
