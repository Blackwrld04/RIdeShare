ALTER TYPE booking_status ADD VALUE 'DISPUTED';

ALTER TYPE refund_kind ADD VALUE 'DISPUTE_RESOLUTION';

ALTER TYPE payout_status ADD VALUE 'ON_HOLD';

ALTER TYPE payout_status ADD VALUE 'CANCELLED';

CREATE TYPE payment_dispute_status AS ENUM ('OPEN', 'RELEASED', 'REFUNDED');

CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES ride_bookings(id) ON DELETE RESTRICT,
  opened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status payment_dispute_status NOT NULL DEFAULT 'OPEN',
  reason VARCHAR(1000) NOT NULL,
  resolution_note VARCHAR(1000),
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX payment_disputes_status_opened_idx
ON payment_disputes(status, opened_at);

CREATE INDEX payment_disputes_opener_opened_idx
ON payment_disputes(opened_by_user_id, opened_at DESC);

CREATE INDEX payment_disputes_reviewer_idx
ON payment_disputes(reviewed_by_user_id);
