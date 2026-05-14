-- ============================================================================
-- 00036_drop_promo_alias_columns.sql
-- Phase D / D.1 — Retire the deprecated alias columns on promo_codes.
--
-- Background: 00004 introduced the table with canonical columns
-- (starts_at, expires_at, usage_limit, usage_count). At some point the
-- checkout route was reading valid_from / valid_until / max_uses /
-- times_used, so 00010 added the alias columns + sync_promo_code_fields()
-- BEFORE-INSERT/UPDATE trigger to keep both sides aligned.
--
-- All application code is now on the canonical names (PR for this
-- migration updates: apps/web/src/app/api/checkout/route.ts,
-- apps/web/src/app/api/promos/validate/route.ts, and
-- packages/db/src/repositories/promo.repository.ts). Safe to drop.
--
-- Order matters: drop the trigger before the columns it touches, else
-- the column drops cascade-error on the trigger function.
-- ============================================================================

DROP TRIGGER IF EXISTS sync_promo_code_fields_trigger ON promo_codes;
DROP FUNCTION IF EXISTS sync_promo_code_fields() CASCADE;

ALTER TABLE promo_codes DROP COLUMN IF EXISTS valid_from;
ALTER TABLE promo_codes DROP COLUMN IF EXISTS valid_until;
ALTER TABLE promo_codes DROP COLUMN IF EXISTS max_uses;
ALTER TABLE promo_codes DROP COLUMN IF EXISTS times_used;
