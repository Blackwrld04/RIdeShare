CREATE TYPE profile_gender AS ENUM (
  'WOMAN',
  'MAN',
  'NON_BINARY',
  'PREFER_NOT_TO_SAY'
);

ALTER TABLE user_profiles
  ADD COLUMN gender profile_gender;

ALTER TABLE ride_offers
  ADD COLUMN women_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE ride_series
  ADD COLUMN women_only BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX ride_offers_women_only_departure_idx
  ON ride_offers(women_only, departure_at)
  WHERE status IN ('PUBLISHED'::ride_status, 'FULL'::ride_status);
