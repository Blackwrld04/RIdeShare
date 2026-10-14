CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  phone_e164 VARCHAR(16) NOT NULL,
  relationship VARCHAR(40),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT emergency_contacts_user_phone_key UNIQUE (user_id, phone_e164)
);

CREATE UNIQUE INDEX emergency_contacts_one_primary_idx
  ON emergency_contacts(user_id)
  WHERE is_primary;

CREATE INDEX emergency_contacts_user_created_idx
  ON emergency_contacts(user_id, created_at);

CREATE TABLE ride_location_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL DEFAULT 'participant',
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  accuracy_meters DECIMAL(8, 2),
  heading_degrees SMALLINT,
  speed_meters_per_second DECIMAL(7, 2),
  location geography(Point,4326),
  recorded_at TIMESTAMPTZ(3) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ride_location_pings_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ride_location_pings_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT ride_location_pings_accuracy_check CHECK (accuracy_meters IS NULL OR accuracy_meters BETWEEN 0 AND 10000),
  CONSTRAINT ride_location_pings_heading_check CHECK (heading_degrees IS NULL OR heading_degrees BETWEEN 0 AND 359),
  CONSTRAINT ride_location_pings_speed_check CHECK (speed_meters_per_second IS NULL OR speed_meters_per_second BETWEEN 0 AND 200)
);

CREATE INDEX ride_location_pings_ride_user_recorded_idx
  ON ride_location_pings(ride_offer_id, user_id, recorded_at DESC);

CREATE INDEX ride_location_pings_location_idx
  ON ride_location_pings USING GIST(location);

CREATE TABLE ride_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_digest CHAR(64) NOT NULL UNIQUE,
  label VARCHAR(80),
  expires_at TIMESTAMPTZ(3) NOT NULL,
  revoked_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ride_share_links_creator_ride_created_idx
  ON ride_share_links(created_by_user_id, ride_offer_id, created_at DESC);

CREATE INDEX ride_share_links_expiry_idx
  ON ride_share_links(expires_at);

CREATE TABLE safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_offer_id UUID NOT NULL REFERENCES ride_offers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES ride_bookings(id) ON DELETE SET NULL,
  initiated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  client_alert_id UUID NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  accuracy_meters DECIMAL(8, 2),
  message VARCHAR(500),
  emergency_number VARCHAR(20) NOT NULL DEFAULT '112',
  resolved_at TIMESTAMPTZ(3),
  resolution_note VARCHAR(500),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT safety_alerts_initiator_client_key UNIQUE (initiated_by_user_id, client_alert_id),
  CONSTRAINT safety_alerts_status_check CHECK (status IN ('ACTIVE', 'RESOLVED')),
  CONSTRAINT safety_alerts_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT safety_alerts_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT safety_alerts_accuracy_check CHECK (accuracy_meters IS NULL OR accuracy_meters BETWEEN 0 AND 10000)
);

CREATE INDEX safety_alerts_initiator_created_idx
  ON safety_alerts(initiated_by_user_id, created_at DESC);

CREATE INDEX safety_alerts_ride_status_created_idx
  ON safety_alerts(ride_offer_id, status, created_at DESC);
