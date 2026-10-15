CREATE TYPE user_role AS ENUM ('USER', 'REVIEWER', 'ADMIN');

ALTER TABLE users
ADD COLUMN role user_role NOT NULL DEFAULT 'USER';

ALTER TABLE driver_applications
ADD COLUMN reviewed_by_user_id UUID;

ALTER TABLE driver_documents
ADD COLUMN reviewed_at TIMESTAMPTZ(3),
ADD COLUMN reviewed_by_user_id UUID;

ALTER TABLE driver_applications
ADD CONSTRAINT driver_applications_reviewed_by_user_id_fkey
FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE driver_documents
ADD CONSTRAINT driver_documents_reviewed_by_user_id_fkey
FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX driver_applications_reviewer_idx
ON driver_applications(reviewed_by_user_id);

CREATE INDEX driver_documents_reviewer_idx
ON driver_documents(reviewed_by_user_id);
