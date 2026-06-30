-- ============================================================================
-- 00053_partner_signing_and_stats.sql
--
-- Tier 3 completion:
--  1. Opt-in HMAC request signing per key (require_signature + signing_secret).
--     When enabled, partner requests must carry a timestamp + HMAC signature;
--     replay/forgery protection on top of the bearer key. Default off, so
--     existing integrations are unaffected.
--  2. partner_api_stats view for operator observability (orders, revenue,
--     webhook delivery health, key last-used) per partner.
-- ============================================================================

BEGIN;

ALTER TABLE api_partner_keys ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE api_partner_keys ADD COLUMN IF NOT EXISTS signing_secret    TEXT;

CREATE OR REPLACE VIEW partner_api_stats AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.is_active,
  p.test_mode,
  p.rate_limit_per_min,
  COUNT(o.id) FILTER (WHERE o.is_test IS NOT TRUE)                                   AS orders,
  COALESCE(SUM(o.total) FILTER (
    WHERE o.is_test IS NOT TRUE AND o.payment_status = 'completed'), 0)              AS revenue,
  MAX(o.created_at)                                                                  AS last_order_at,
  (SELECT MAX(k.last_used_at) FROM api_partner_keys k WHERE k.partner_id = p.id)     AS key_last_used_at,
  (SELECT COUNT(*) FROM partner_webhook_deliveries d
     WHERE d.partner_id = p.id AND d.status = 'delivered')                          AS webhooks_delivered,
  (SELECT COUNT(*) FROM partner_webhook_deliveries d
     WHERE d.partner_id = p.id AND d.status IN ('failed', 'dead'))                  AS webhooks_failing
FROM api_partners p
LEFT JOIN orders o ON o.partner_id = p.id
GROUP BY p.id;

REVOKE ALL ON partner_api_stats FROM anon, authenticated;

COMMIT;
