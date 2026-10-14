CREATE TYPE upload_status AS ENUM (
  'PENDING',
  'READY',
  'EXPIRED',
  'QUARANTINED',
  'DELETED'
);

CREATE TABLE upload_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(64) NOT NULL,
  object_key VARCHAR(512) NOT NULL UNIQUE,
  content_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  status upload_status NOT NULL DEFAULT 'PENDING',
  upload_expires_at TIMESTAMPTZ(3) NOT NULL,
  completed_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT upload_assets_size_bytes_check CHECK (size_bytes > 0)
);

CREATE INDEX upload_assets_owner_status_idx
  ON upload_assets(owner_user_id, status);

CREATE INDEX upload_assets_status_expiry_idx
  ON upload_assets(status, upload_expires_at);

ALTER TABLE driver_documents
  ADD COLUMN asset_id UUID UNIQUE REFERENCES upload_assets(id) ON DELETE RESTRICT;
