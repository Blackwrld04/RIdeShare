CREATE TYPE user_report_category AS ENUM (
  'SAFETY',
  'HARASSMENT',
  'FRAUD',
  'NO_SHOW',
  'OTHER'
);

CREATE TYPE user_report_status AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED'
);

CREATE TABLE user_reports (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  reporter_user_id UUID NOT NULL,
  subject_user_id UUID NOT NULL,
  category user_report_category NOT NULL,
  details VARCHAR(1000) NOT NULL,
  status user_report_status NOT NULL DEFAULT 'OPEN',
  resolution_note VARCHAR(1000),
  reviewed_by_user_id UUID,
  reviewed_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT user_reports_distinct_users_check CHECK (reporter_user_id <> subject_user_id),
  CONSTRAINT user_reports_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES ride_bookings(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT user_reports_reporter_user_id_fkey
    FOREIGN KEY (reporter_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT user_reports_subject_user_id_fkey
    FOREIGN KEY (subject_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT user_reports_reviewed_by_user_id_fkey
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX user_reports_booking_reporter_key
ON user_reports(booking_id, reporter_user_id);

CREATE INDEX user_reports_status_created_idx
ON user_reports(status, created_at ASC);

CREATE INDEX user_reports_reporter_created_idx
ON user_reports(reporter_user_id, created_at DESC);

CREATE INDEX user_reports_subject_created_idx
ON user_reports(subject_user_id, created_at DESC);

CREATE INDEX user_reports_reviewer_idx
ON user_reports(reviewed_by_user_id);
