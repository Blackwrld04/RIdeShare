ALTER TABLE ride_offers
  ADD COLUMN route_path JSONB,
  ADD COLUMN route_distance_meters INTEGER,
  ADD COLUMN route_duration_seconds INTEGER,
  ADD COLUMN routing_source VARCHAR(32),
  ADD COLUMN routing_profile VARCHAR(32),
  ADD COLUMN route_corridor geometry(LineString,4326),
  ADD CONSTRAINT ride_offers_route_distance_check
    CHECK (route_distance_meters IS NULL OR route_distance_meters > 0),
  ADD CONSTRAINT ride_offers_route_duration_check
    CHECK (route_duration_seconds IS NULL OR route_duration_seconds > 0),
  ADD CONSTRAINT ride_offers_route_metadata_check
    CHECK (
      (route_path IS NULL AND route_distance_meters IS NULL AND route_duration_seconds IS NULL)
      OR
      (route_path IS NOT NULL AND route_distance_meters IS NOT NULL AND route_duration_seconds IS NOT NULL)
    );

CREATE INDEX ride_offers_route_corridor_idx
  ON ride_offers USING GIST(route_corridor);

ALTER TABLE ride_bookings
  ADD COLUMN pickup_latitude DECIMAL(9, 6),
  ADD COLUMN pickup_longitude DECIMAL(9, 6),
  ADD COLUMN pickup_route_fraction DECIMAL(9, 8),
  ADD COLUMN pickup_distance_meters INTEGER,
  ADD COLUMN dropoff_latitude DECIMAL(9, 6),
  ADD COLUMN dropoff_longitude DECIMAL(9, 6),
  ADD COLUMN dropoff_route_fraction DECIMAL(9, 8),
  ADD COLUMN dropoff_distance_meters INTEGER,
  ADD COLUMN segment_distance_meters INTEGER,
  ADD CONSTRAINT ride_bookings_pickup_latitude_check
    CHECK (pickup_latitude IS NULL OR pickup_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT ride_bookings_pickup_longitude_check
    CHECK (pickup_longitude IS NULL OR pickup_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT ride_bookings_dropoff_latitude_check
    CHECK (dropoff_latitude IS NULL OR dropoff_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT ride_bookings_dropoff_longitude_check
    CHECK (dropoff_longitude IS NULL OR dropoff_longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT ride_bookings_route_fraction_check
    CHECK (
      pickup_route_fraction IS NULL
      OR dropoff_route_fraction IS NULL
      OR (
        pickup_route_fraction >= 0
        AND dropoff_route_fraction <= 1
        AND pickup_route_fraction < dropoff_route_fraction
      )
    ),
  ADD CONSTRAINT ride_bookings_segment_distance_check
    CHECK (segment_distance_meters IS NULL OR segment_distance_meters > 0),
  ADD CONSTRAINT ride_bookings_journey_metadata_check
    CHECK (
      (
        pickup_latitude IS NULL
        AND pickup_longitude IS NULL
        AND pickup_route_fraction IS NULL
        AND pickup_distance_meters IS NULL
        AND dropoff_latitude IS NULL
        AND dropoff_longitude IS NULL
        AND dropoff_route_fraction IS NULL
        AND dropoff_distance_meters IS NULL
        AND segment_distance_meters IS NULL
      )
      OR
      (
        pickup_latitude IS NOT NULL
        AND pickup_longitude IS NOT NULL
        AND pickup_route_fraction IS NOT NULL
        AND pickup_distance_meters IS NOT NULL
        AND dropoff_latitude IS NOT NULL
        AND dropoff_longitude IS NOT NULL
        AND dropoff_route_fraction IS NOT NULL
        AND dropoff_distance_meters IS NOT NULL
        AND segment_distance_meters IS NOT NULL
      )
    );
