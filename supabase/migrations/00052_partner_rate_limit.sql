-- ============================================================================
-- 00052_partner_rate_limit.sql
--
-- Tier 3 hardening: per-partner request rate limit. Each partner gets a
-- configurable requests-per-minute ceiling, enforced server-side keyed on the
-- partner id (a compromised or buggy partner can no longer hammer the API or
-- exhaust another partner's headroom). Default 120/min.
-- ============================================================================

BEGIN;

ALTER TABLE api_partners
  ADD COLUMN IF NOT EXISTS rate_limit_per_min INT NOT NULL DEFAULT 120;

COMMIT;
