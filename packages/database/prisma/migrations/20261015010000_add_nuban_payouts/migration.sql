ALTER TYPE ledger_journal_kind ADD VALUE 'PAYOUT_REVERSED';

CREATE TYPE bank_account_status AS ENUM ('VERIFIED', 'DISABLED');

CREATE TYPE payout_status AS ENUM (
  'SCHEDULED',
  'PROCESSING',
  'SUBMITTED',
  'SUCCESS',
  'FAILED',
  'REVERSED'
);

CREATE TABLE driver_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID NOT NULL UNIQUE REFERENCES driver_applications(id) ON DELETE RESTRICT,
  status bank_account_status NOT NULL DEFAULT 'VERIFIED',
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  account_name VARCHAR(120) NOT NULL,
  account_number_last4 CHAR(4) NOT NULL,
  provider_recipient_code VARCHAR(40) NOT NULL UNIQUE,
  resolved_at TIMESTAMPTZ(3) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT driver_bank_accounts_last4_check CHECK (account_number_last4 ~ '^\d{4}$')
);

CREATE TABLE driver_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL UNIQUE REFERENCES ride_offers(id) ON DELETE RESTRICT,
  driver_application_id UUID NOT NULL REFERENCES driver_applications(id) ON DELETE RESTRICT,
  bank_account_id UUID NOT NULL REFERENCES driver_bank_accounts(id) ON DELETE RESTRICT,
  status payout_status NOT NULL DEFAULT 'SCHEDULED',
  amount_kobo BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  reference VARCHAR(50) NOT NULL UNIQUE,
  provider_transfer_code VARCHAR(40) UNIQUE,
  provider_message VARCHAR(280),
  scheduled_for TIMESTAMPTZ(3) NOT NULL,
  attempted_at TIMESTAMPTZ(3),
  submitted_at TIMESTAMPTZ(3),
  completed_at TIMESTAMPTZ(3),
  failed_at TIMESTAMPTZ(3),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT driver_payouts_amount_check CHECK (amount_kobo > 0),
  CONSTRAINT driver_payouts_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT driver_payouts_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE INDEX driver_payouts_status_scheduled_idx
  ON driver_payouts(status, scheduled_for);

CREATE INDEX driver_payouts_driver_created_idx
  ON driver_payouts(driver_application_id, created_at DESC);

ALTER TABLE ledger_journals
  ADD COLUMN payout_id UUID REFERENCES driver_payouts(id) ON DELETE RESTRICT,
  ALTER COLUMN booking_id DROP NOT NULL;
