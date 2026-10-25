-- AlterTable users: add password_hash
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);

-- AlterTable phone_otp_challenges: expand delivery_provider from VARCHAR(32) to VARCHAR(255)
ALTER TABLE "phone_otp_challenges" ALTER COLUMN "delivery_provider" TYPE VARCHAR(255);
