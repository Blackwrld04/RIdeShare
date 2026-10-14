CREATE TYPE ride_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'FULL',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE ride_point_kind AS ENUM ('ORIGIN', 'WAYPOINT', 'DESTINATION');

CREATE TABLE ride_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID NOT NULL REFERENCES driver_applications(id) ON DELETE CASCADE,
  status ride_status NOT NULL DEFAULT 'DRAFT',
  departure_at TIMESTAMPTZ(3) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Lagos',
  passenger_seats SMALLINT NOT NULL,
  contribution_kobo BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  notes VARCHAR(280),
  published_at TIMESTAMPTZ(3),
  cancelled_at TIMESTAMPTZ(3),
  cancellation_reason VARCHAR(280),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT ride_offers_passenger_seats_check CHECK (passenger_seats BETWEEN 1 AND 7),
  CONSTRAINT ride_offers_contribution_kobo_check CHECK (contribution_kobo >= 0),
  CONSTRAINT ride_offers_currency_check CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX ride_offers_driver_departure_idx
  ON ride_offers(driver_application_id, departure_at DESC);

CREATE INDEX ride_offers_status_departure_idx
  ON ride_offers(status, departure_at);

CREATE TABLE ride_route_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL,
  kind ride_point_kind NOT NULL,
  label VARCHAR(120) NOT NULL,
  address VARCHAR(200),
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  external_source VARCHAR(32),
  external_id VARCHAR(128),
  location geography(Point,4326) GENERATED ALWAYS AS (
    ST_SetSRID(
      ST_MakePoint(longitude::DOUBLE PRECISION, latitude::DOUBLE PRECISION),
      4326
    )::geography
  ) STORED,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ride_route_points_sequence_check CHECK (sequence >= 0),
  CONSTRAINT ride_route_points_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ride_route_points_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT ride_route_points_offer_sequence_key UNIQUE (ride_offer_id, sequence)
);

CREATE INDEX ride_route_points_offer_kind_idx
  ON ride_route_points(ride_offer_id, kind);

CREATE INDEX ride_route_points_location_idx
  ON ride_route_points USING GIST(location);
