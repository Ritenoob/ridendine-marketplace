-- ============================================================================
-- 00050_partner_api_keys_and_test_mode.sql
--
-- Tier 1 partner-API upgrade:
--  A. Per-partner API identity. Replaces the single shared PARTNER_API_KEY env
--     secret with DB-backed, individually-revocable, scoped keys. Each request
--     resolves to a partner so orders can be attributed, rate-limited, and
--     reconciled per partner. Keys are stored as sha256 hashes (never plaintext).
--  B. Test mode. A partner (or an order) flagged test_mode/is_test is recorded
--     but kept OUT of the live kitchen queue, finance, loyalty, and payouts, so
--     integration testing never pollutes production.
--
-- service_role bypasses RLS; these tables are admin-only (no anon/authenticated).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS api_partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  test_mode   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_partner_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES api_partners(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,            -- sha256 hex of the presented key
  key_prefix   VARCHAR(24) NOT NULL,            -- display only (e.g. rdk_live_08f8)
  scopes       JSONB NOT NULL DEFAULT '["quote","checkout"]'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_partner_keys_hash    ON api_partner_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_partner_keys_partner ON api_partner_keys(partner_id);

-- Attribute each order to its originating partner + carry the test flag.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES api_partners(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test    BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_partner ON orders(partner_id);

-- Admin-only: RLS on, and explicitly revoke the broad 00029 anon/authenticated grants.
ALTER TABLE api_partners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_partner_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON api_partners     FROM anon, authenticated;
REVOKE ALL ON api_partner_keys FROM anon, authenticated;

-- Seed the existing shared key as a real partner so the live integration keeps
-- working seamlessly (now attributed + revocable). Hash is sha256 of the key.
INSERT INTO api_partners (id, name, slug, is_active, test_mode)
VALUES ('a0000000-0000-4000-a000-000000000001', 'Hoang Gia Pho', 'hoang-gia-pho', true, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO api_partner_keys (partner_id, key_hash, key_prefix, scopes, is_active)
VALUES (
  'a0000000-0000-4000-a000-000000000001',
  'f9528eefba0027d623df3b0ae4350c4fba5ed9c9e82e526b26231258012e255f',
  'rdk_live_08f8',
  '["quote","checkout"]'::jsonb,
  true
)
ON CONFLICT (key_hash) DO NOTHING;

COMMIT;
