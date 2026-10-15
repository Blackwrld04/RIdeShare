import "dotenv/config";
import { createDatabase, UserRole } from "@commuteshare/database";
import { normalizeNigerianPhone } from "../auth/phone-number.js";

const databaseUrl = process.env.DATABASE_URL;
const adminPhone = process.env.ADMIN_PHONE_E164;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
if (!adminPhone) {
  throw new Error("ADMIN_PHONE_E164 is required");
}

const phoneE164 = normalizeNigerianPhone(adminPhone);
const database = createDatabase(databaseUrl);

try {
  const user = await database.client.user.update({
    where: { phoneE164 },
    data: { role: UserRole.ADMIN },
    select: { id: true, phoneE164: true, role: true },
  });
  process.stdout.write(`${user.phoneE164} promoted to ${user.role}\n`);
} finally {
  await database.close();
}
