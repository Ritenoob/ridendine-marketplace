-- ============================================================================
-- 00048_customer_addresses_schema_convergence.sql
-- Converge fresh-replay databases to the PRODUCTION customer_addresses shape.
--
-- Production reality (verified 2026-06-11 via information_schema):
--   customer_addresses has address_line1 / address_line2 — the conditional
--   rename in 00006 (address_line1 -> street_address, drop address_line2)
--   never took effect there; the file evidently gained that block after
--   production had already recorded 00006 as applied. Every application
--   query (chef-admin order detail/list, ops order detail, customer address
--   repository, engine customers service) targets address_line1 and works
--   against production.
--
-- A FRESH migration replay (CI e2e stack, local supabase db reset) does run
-- 00006's rename, leaving street_address and no address_line2 — which broke
-- the chef-admin order GET and friends on the seeded CI stack. This
-- migration renames it back and restores address_line2, making replayed
-- schemas match production. On production itself both statements are no-ops.
--
-- (order.repository.ts keeps a street_address read-fallback from when this
-- drift was first noticed; it is harmless either way.)
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_addresses'
      AND column_name = 'street_address'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_addresses'
      AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE customer_addresses RENAME COLUMN street_address TO address_line1;
  END IF;
END $$;

ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);

COMMIT;
