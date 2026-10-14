CREATE TYPE refund_status AS ENUM (
  'REQUESTED',
  'SUBMITTING',
  'SUBMITTED',
  'PROCESSING',
  'NEEDS_ATTENTION',
  'PROCESSED',
  'FAILED'
);

CREATE TYPE refund_kind AS ENUM (
  'PASSENGER_CANCELLATION',
  'DRIVER_CANCELLATION',
  'FULFILLMENT_FAILED'
);

CREATE TYPE ledger_journal_kind AS ENUM (
  'ESCROW_FUNDED',
  'REFUND_RESERVED',
  'REFUND_SETTLED',
  'TRIP_SETTLED',
  'PAYOUT_SETTLED'
);

CREATE TYPE ledger_account AS ENUM (
  'PLATFORM_CASH',
  'PASSENGER_ESCROW',
  'REFUND_PAYABLE',
  'DRIVER_PAYABLE',
  'PLATFORM_REVENUE'
);

CREATE TYPE ledger_direction AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES ride_bookings(id) ON DELETE RESTRICT,
  kind refund_kind NOT NULL,
  status refund_status NOT NULL DEFAULT 'REQUESTED',
  amount_kobo BIGINT NOT NULL,
  driver_compensation_kobo BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  reason VARCHAR(280) NOT NULL,
  provider_refund_id VARCHAR(32) UNIQUE,
  provider_message VARCHAR(280),
  submitted_at TIMESTAMPTZ(3),
  processed_at TIMESTAMPTZ(3),
  failed_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT payment_refunds_amount_check CHECK (amount_kobo > 0),
  CONSTRAINT payment_refunds_compensation_check CHECK (driver_compensation_kobo >= 0),
  CONSTRAINT payment_refunds_currency_check CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX payment_refunds_status_created_idx
  ON payment_refunds(status, created_at);

CREATE TABLE ledger_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES ride_bookings(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  refund_id UUID REFERENCES payment_refunds(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  kind ledger_journal_kind NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ledger_journals_currency_check CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX ledger_journals_booking_created_idx
  ON ledger_journals(booking_id, created_at);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES ledger_journals(id) ON DELETE RESTRICT,
  account ledger_account NOT NULL,
  direction ledger_direction NOT NULL,
  amount_kobo BIGINT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ledger_entries_amount_check CHECK (amount_kobo > 0)
);

CREATE INDEX ledger_entries_account_created_idx
  ON ledger_entries(account, created_at);

CREATE FUNCTION reject_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ledger records are immutable';
END;
$$;

CREATE TRIGGER ledger_journals_immutable
BEFORE UPDATE OR DELETE ON ledger_journals
FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();

CREATE TRIGGER ledger_entries_immutable
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
