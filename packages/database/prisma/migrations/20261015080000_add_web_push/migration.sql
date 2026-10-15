CREATE TYPE push_delivery_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED'
);

ALTER TABLE user_notifications
ADD COLUMN push_prepared_at TIMESTAMPTZ(3);

UPDATE user_notifications
SET push_prepared_at = NOW();

CREATE TABLE web_push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  p256dh VARCHAR(256) NOT NULL,
  auth VARCHAR(128) NOT NULL,
  expiration_at TIMESTAMPTZ(3),
  user_agent VARCHAR(512),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT web_push_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX web_push_subscriptions_endpoint_hash_key
ON web_push_subscriptions(endpoint_hash);

CREATE INDEX web_push_subscriptions_user_enabled_idx
ON web_push_subscriptions(user_id, enabled);

CREATE TABLE web_push_deliveries (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  status push_delivery_status NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ(3),
  sent_at TIMESTAMPTZ(3),
  failed_at TIMESTAMPTZ(3),
  last_error VARCHAR(500),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT web_push_deliveries_notification_id_fkey
    FOREIGN KEY (notification_id) REFERENCES user_notifications(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT web_push_deliveries_subscription_id_fkey
    FOREIGN KEY (subscription_id) REFERENCES web_push_subscriptions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX web_push_deliveries_notification_subscription_key
ON web_push_deliveries(notification_id, subscription_id);

CREATE INDEX web_push_deliveries_status_next_attempt_idx
ON web_push_deliveries(status, next_attempt_at);

CREATE INDEX user_notifications_push_prepared_created_idx
ON user_notifications(push_prepared_at, created_at);
