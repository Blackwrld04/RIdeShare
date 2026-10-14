CREATE TYPE ride_series_status AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

CREATE TABLE ride_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID NOT NULL REFERENCES driver_applications(id) ON DELETE RESTRICT,
  status ride_series_status NOT NULL DEFAULT 'ACTIVE',
  timezone VARCHAR(64) NOT NULL,
  departure_time_minutes SMALLINT NOT NULL,
  days_of_week SMALLINT[] NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE,
  lookahead_days SMALLINT NOT NULL DEFAULT 14,
  passenger_seats SMALLINT NOT NULL,
  contribution_kobo BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  route_path JSONB NOT NULL,
  route_distance_meters INTEGER NOT NULL,
  route_duration_seconds INTEGER NOT NULL,
  routing_source VARCHAR(32),
  routing_profile VARCHAR(32),
  route_corridor geometry(LineString,4326),
  notes VARCHAR(280),
  last_generated_through DATE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT ride_series_departure_time_check CHECK (departure_time_minutes BETWEEN 0 AND 1439),
  CONSTRAINT ride_series_days_check CHECK (
    cardinality(days_of_week) BETWEEN 1 AND 7
    AND days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]
  ),
  CONSTRAINT ride_series_dates_check CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CONSTRAINT ride_series_lookahead_check CHECK (lookahead_days BETWEEN 1 AND 30),
  CONSTRAINT ride_series_passenger_seats_check CHECK (passenger_seats BETWEEN 1 AND 7),
  CONSTRAINT ride_series_contribution_check CHECK (contribution_kobo >= 0),
  CONSTRAINT ride_series_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ride_series_route_distance_check CHECK (route_distance_meters > 0),
  CONSTRAINT ride_series_route_duration_check CHECK (route_duration_seconds > 0)
);

CREATE INDEX ride_series_driver_status_idx
  ON ride_series(driver_application_id, status);

CREATE INDEX ride_series_schedule_idx
  ON ride_series(status, starts_on, ends_on);

CREATE INDEX ride_series_route_corridor_idx
  ON ride_series USING GIST(route_corridor);

CREATE TABLE ride_series_route_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_series_id UUID NOT NULL REFERENCES ride_series(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL,
  kind ride_point_kind NOT NULL,
  label VARCHAR(120) NOT NULL,
  address VARCHAR(200),
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  external_source VARCHAR(32),
  external_id VARCHAR(128),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ride_series_route_points_sequence_check CHECK (sequence >= 0),
  CONSTRAINT ride_series_route_points_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ride_series_route_points_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT ride_series_route_points_series_sequence_key UNIQUE (ride_series_id, sequence)
);

ALTER TABLE ride_offers
  ADD COLUMN series_id UUID REFERENCES ride_series(id) ON DELETE RESTRICT,
  ADD COLUMN service_date DATE,
  ADD CONSTRAINT ride_offers_series_service_date_check CHECK (
    (series_id IS NULL AND service_date IS NULL)
    OR (series_id IS NOT NULL AND service_date IS NOT NULL)
  ),
  ADD CONSTRAINT ride_offers_series_service_date_key UNIQUE (series_id, service_date);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(500) NOT NULL,
  data JSONB,
  idempotency_key VARCHAR(180) NOT NULL UNIQUE,
  read_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX user_notifications_user_read_created_idx
  ON user_notifications(user_id, read_at, created_at DESC);
