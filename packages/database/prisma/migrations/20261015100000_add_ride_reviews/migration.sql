CREATE TABLE ride_reviews (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  subject_user_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  comment VARCHAR(500),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT ride_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ride_reviews_distinct_users_check CHECK (author_user_id <> subject_user_id),
  CONSTRAINT ride_reviews_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES ride_bookings(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ride_reviews_author_user_id_fkey
    FOREIGN KEY (author_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ride_reviews_subject_user_id_fkey
    FOREIGN KEY (subject_user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX ride_reviews_booking_author_key
ON ride_reviews(booking_id, author_user_id);

CREATE INDEX ride_reviews_subject_created_idx
ON ride_reviews(subject_user_id, created_at DESC, id DESC);

CREATE INDEX ride_reviews_author_created_idx
ON ride_reviews(author_user_id, created_at DESC);
