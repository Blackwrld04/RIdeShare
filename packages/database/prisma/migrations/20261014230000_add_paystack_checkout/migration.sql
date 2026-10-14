ALTER TYPE booking_status ADD VALUE 'AWAITING_PAYMENT' AFTER 'PENDING';

ALTER TABLE user_profiles
  ADD COLUMN billing_email VARCHAR(255) UNIQUE;

CREATE TYPE payment_provider AS ENUM ('PAYSTACK');

CREATE TYPE payment_status AS ENUM (
  'INITIALIZING',
  'INITIALIZED',
  'SUCCEEDED',
  'FAILED',
  'REFUND_PENDING',
  'REFUNDED'
);

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES ride_bookings(id) ON DELETE RESTRICT,
  provider payment_provider NOT NULL DEFAULT 'PAYSTACK',
  status payment_status NOT NULL DEFAULT 'INITIALIZING',
  reference VARCHAR(100) NOT NULL UNIQUE,
  base_amount_kobo BIGINT NOT NULL,
  platform_fee_kobo BIGINT NOT NULL,
  amount_kobo BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  authorization_url VARCHAR(512),
  access_code VARCHAR(100),
  provider_transaction_id VARCHAR(32) UNIQUE,
  provider_message VARCHAR(280),
  paid_at TIMESTAMPTZ(3),
  failed_at TIMESTAMPTZ(3),
  refund_required_at TIMESTAMPTZ(3),
  refunded_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT payment_transactions_base_amount_check CHECK (base_amount_kobo >= 0),
  CONSTRAINT payment_transactions_platform_fee_check CHECK (platform_fee_kobo >= 0),
  CONSTRAINT payment_transactions_amount_check CHECK (amount_kobo = base_amount_kobo + platform_fee_kobo),
  CONSTRAINT payment_transactions_currency_check CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX payment_transactions_booking_status_idx
  ON payment_transactions(booking_id, status);

CREATE INDEX payment_transactions_status_created_idx
  ON payment_transactions(status, created_at);

CREATE UNIQUE INDEX payment_transactions_active_booking_key
  ON payment_transactions(booking_id)
  WHERE status IN ('INITIALIZING', 'INITIALIZED');

DROP INDEX ride_bookings_active_passenger_offer_key;

CREATE UNIQUE INDEX ride_bookings_active_passenger_offer_key
  ON ride_bookings(ride_offer_id, passenger_user_id)
  WHERE status IN ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED');
