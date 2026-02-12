CREATE TABLE org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  salt BYTEA NOT NULL,            -- 16 bytes (crypto_pwhash_SALTBYTES)
  auth_key_hash TEXT NOT NULL,    -- SHA-256 hex of auth_key_material
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE encrypted_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  nonce BYTEA NOT NULL,           -- 24 bytes
  ciphertext BYTEA NOT NULL,      -- encrypted Conversation JSON
  platform TEXT NOT NULL,         -- unencrypted (for filtering)
  external_id TEXT NOT NULL,      -- unencrypted (for dedup)
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, platform, external_id)
);

CREATE INDEX idx_enc_conv_org ON encrypted_conversation(org_id);
CREATE INDEX idx_enc_conv_sync ON encrypted_conversation(org_id, imported_at);
