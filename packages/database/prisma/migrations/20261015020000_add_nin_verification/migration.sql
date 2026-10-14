CREATE TYPE identity_verification_status AS ENUM (
  'PENDING',
  'VERIFIED',
  'FAILED'
);

CREATE TABLE user_identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  status identity_verification_status NOT NULL DEFAULT 'PENDING',
  provider VARCHAR(32) NOT NULL,
  provider_reference VARCHAR(100) UNIQUE,
  nin_ciphertext BYTEA NOT NULL,
  nin_iv BYTEA NOT NULL,
  nin_auth_tag BYTEA NOT NULL,
  nin_lookup_hash CHAR(64) NOT NULL UNIQUE,
  nin_last4 CHAR(4) NOT NULL,
  legal_first_name VARCHAR(80) NOT NULL,
  legal_last_name VARCHAR(80) NOT NULL,
  date_of_birth DATE NOT NULL,
  consent_version VARCHAR(32) NOT NULL,
  consented_at TIMESTAMPTZ(3) NOT NULL,
  failure_reason VARCHAR(280),
  verified_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT user_identity_verifications_nin_last4_check CHECK (nin_last4 ~ '^\d{4}$'),
  CONSTRAINT user_identity_verifications_hash_check CHECK (nin_lookup_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT user_identity_verifications_iv_check CHECK (octet_length(nin_iv) = 12),
  CONSTRAINT user_identity_verifications_tag_check CHECK (octet_length(nin_auth_tag) = 16)
);

CREATE INDEX user_identity_verifications_status_created_idx
  ON user_identity_verifications(status, created_at);
