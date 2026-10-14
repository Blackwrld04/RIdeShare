CREATE TYPE booking_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'DECLINED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE ride_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  passenger_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats SMALLINT NOT NULL,
  status booking_status NOT NULL DEFAULT 'PENDING',
  unit_contribution_kobo BIGINT NOT NULL,
  total_contribution_kobo BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  decided_at TIMESTAMPTZ(3),
  cancelled_at TIMESTAMPTZ(3),
  cancellation_reason VARCHAR(280),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT ride_bookings_seats_check CHECK (seats BETWEEN 1 AND 7),
  CONSTRAINT ride_bookings_unit_contribution_check CHECK (unit_contribution_kobo >= 0),
  CONSTRAINT ride_bookings_total_contribution_check CHECK (total_contribution_kobo >= 0),
  CONSTRAINT ride_bookings_currency_check CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX ride_bookings_offer_status_idx
  ON ride_bookings(ride_offer_id, status);

CREATE INDEX ride_bookings_passenger_created_idx
  ON ride_bookings(passenger_user_id, created_at DESC);

CREATE UNIQUE INDEX ride_bookings_active_passenger_offer_key
  ON ride_bookings(ride_offer_id, passenger_user_id)
  WHERE status IN ('PENDING', 'CONFIRMED');
