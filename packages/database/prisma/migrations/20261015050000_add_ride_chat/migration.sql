CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES ride_bookings(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  client_message_id UUID NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'text',
  body VARCHAR(1000) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chat_messages_sender_client_key UNIQUE (sender_user_id, client_message_id)
);

CREATE INDEX chat_messages_booking_created_idx
  ON chat_messages(booking_id, created_at DESC, id DESC);

CREATE TABLE chat_read_receipts (
  booking_id UUID NOT NULL REFERENCES ride_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  read_through_at TIMESTAMPTZ(3) NOT NULL,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY (booking_id, user_id)
);
