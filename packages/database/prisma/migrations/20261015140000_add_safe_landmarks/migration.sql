CREATE TABLE safe_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  address VARCHAR(200) NOT NULL,
  category VARCHAR(64) NOT NULL,
  city VARCHAR(80) NOT NULL,
  state VARCHAR(80) NOT NULL,
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  location geography(Point,4326) GENERATED ALWAYS AS (
    ST_SetSRID(
      ST_MakePoint(longitude::DOUBLE PRECISION, latitude::DOUBLE PRECISION),
      4326
    )::geography
  ) STORED,
  external_source VARCHAR(32),
  external_id VARCHAR(128),
  safety_notes VARCHAR(500),
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT safe_landmarks_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT safe_landmarks_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT safe_landmarks_external_pair_check CHECK (
    (external_source IS NULL AND external_id IS NULL)
    OR (external_source IS NOT NULL AND external_id IS NOT NULL)
  ),
  CONSTRAINT safe_landmarks_external_key UNIQUE (external_source, external_id)
);

CREATE INDEX safe_landmarks_location_idx
  ON safe_landmarks USING GIST(location);

CREATE INDEX safe_landmarks_city_active_idx
  ON safe_landmarks(city, is_active);

CREATE INDEX safe_landmarks_category_active_idx
  ON safe_landmarks(category, is_active);

ALTER TABLE ride_route_points
  ADD COLUMN safe_landmark_id UUID REFERENCES safe_landmarks(id) ON DELETE SET NULL;

CREATE INDEX ride_route_points_landmark_idx
  ON ride_route_points(safe_landmark_id);

ALTER TABLE ride_series_route_points
  ADD COLUMN safe_landmark_id UUID REFERENCES safe_landmarks(id) ON DELETE SET NULL;

CREATE INDEX ride_series_route_points_landmark_idx
  ON ride_series_route_points(safe_landmark_id);
