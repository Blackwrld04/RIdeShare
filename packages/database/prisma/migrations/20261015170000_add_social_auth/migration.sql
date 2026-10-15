CREATE TABLE social_auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) NOT NULL,
  nonce_digest CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ(3) NOT NULL,
  consumed_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX social_auth_challenges_expiry_idx
  ON social_auth_challenges(expires_at);

CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT social_accounts_provider_subject_key
    UNIQUE (provider, provider_subject),
  CONSTRAINT social_accounts_user_provider_key
    UNIQUE (user_id, provider)
);

CREATE INDEX social_accounts_user_idx
  ON social_accounts(user_id);
