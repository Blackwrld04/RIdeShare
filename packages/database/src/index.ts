import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

export {
  Prisma,
  PrismaClient,
  UserStatus,
} from "./generated/prisma/client.js";

export interface Database {
  client: PrismaClient;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string): Database {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
    max: 10,
    query_timeout: 2_000,
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
