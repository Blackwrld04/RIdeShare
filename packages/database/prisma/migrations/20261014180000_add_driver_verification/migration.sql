CREATE TYPE driver_application_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TYPE driver_document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status driver_application_status NOT NULL DEFAULT 'DRAFT',
  legal_first_name VARCHAR(80),
  legal_last_name VARCHAR(80),
  date_of_birth DATE,
  residential_address VARCHAR(160),
  city VARCHAR(80),
  state VARCHAR(80),
  submitted_at TIMESTAMPTZ(3),
  reviewed_at TIMESTAMPTZ(3),
  decision_reason VARCHAR(500),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL
);

CREATE INDEX driver_applications_status_submitted_idx
  ON driver_applications(status, submitted_at);

CREATE TABLE driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID NOT NULL UNIQUE REFERENCES driver_applications(id) ON DELETE CASCADE,
  make VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  color VARCHAR(40) NOT NULL,
  year SMALLINT NOT NULL,
  registration_number VARCHAR(20) NOT NULL UNIQUE,
  seat_capacity SMALLINT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT driver_vehicles_year_check CHECK (year BETWEEN 1980 AND 2100),
  CONSTRAINT driver_vehicles_seat_capacity_check CHECK (seat_capacity BETWEEN 2 AND 8)
);

CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID NOT NULL REFERENCES driver_applications(id) ON DELETE CASCADE,
  kind VARCHAR(64) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  issued_on DATE,
  expires_on DATE,
  status driver_document_status NOT NULL DEFAULT 'PENDING',
  rejection_reason VARCHAR(500),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT driver_documents_size_bytes_check CHECK (size_bytes > 0),
  CONSTRAINT driver_documents_application_kind_key UNIQUE (driver_application_id, kind)
);

CREATE INDEX driver_documents_status_idx ON driver_documents(status);
