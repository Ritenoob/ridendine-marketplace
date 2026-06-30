-- ============================================================================
-- 00051_partner_webhooks.sql
--
-- Tier 2: partner status webhooks. Partners register a webhook_url (+ secret for
-- HMAC signing); a processor delivers order-lifecycle events (received,
-- accepted, preparing, ready, delivered, cancelled) from domain_events to the
-- partner so their storefront can show live status instead of stopping at
-- payment. Delivery is logged + retried (idempotent on domain_event_id).
-- ============================================================================

BEGIN;

ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS webhook_url    TEXT;
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

CREATE TABLE IF NOT EXISTS partner_webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES api_partners(id) ON DELETE CASCADE,
  order_id        UUID,
  domain_event_id UUID NOT NULL UNIQUE,        -- idempotency: one delivery per event
  event_type      TEXT NOT NULL,               -- partner-facing event (order.ready, ...)
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending|delivered|failed|dead
  attempts        INT  NOT NULL DEFAULT 0,
  max_attempts    INT  NOT NULL DEFAULT 6,
  response_code   INT,
  last_error      TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pwd_due     ON partner_webhook_deliveries(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_pwd_partner ON partner_webhook_deliveries(partner_id);

ALTER TABLE partner_webhook_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON partner_webhook_deliveries FROM anon, authenticated;

COMMIT;
