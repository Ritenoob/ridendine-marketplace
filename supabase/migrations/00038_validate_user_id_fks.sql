-- ============================================================================
-- 00038_validate_user_id_fks.sql
-- D.12 completion — enforce FK constraints on existing rows.
--
-- Migration 00034 re-added the user_id foreign keys on chef_profiles,
-- drivers, and customers (all pointing to auth.users with ON DELETE SET NULL)
-- but added them as NOT VALID, which skips validation of existing rows.
--
-- 2026-05-14 orphan audit verified zero violations across all three tables:
--   chef_profiles: 4 rows with user_id, 0 orphans
--   drivers:       3 rows with user_id, 0 orphans
--   customers:     3 rows with user_id, 0 orphans
--   (drivers and customers also have 2 NULL rows each — Marcus / Priya /
--    Alex / Jordan seed UUIDs. NULL is allowed by the FK.)
--
-- This migration runs VALIDATE CONSTRAINT to enforce the FK on existing
-- rows too. After this, every chef/driver/customer row is guaranteed to
-- either have NULL user_id OR point to a real auth.users entry.
--
-- Idempotent: VALIDATE CONSTRAINT is safe to re-run; it's a check, not a
-- structural change. If the constraint doesn't exist yet, the ALTER errors
-- out — wrapped in DO block to no-op gracefully in that case.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chef_profiles_user_id_fkey'
      AND conrelid = 'public.chef_profiles'::regclass
  ) THEN
    ALTER TABLE chef_profiles VALIDATE CONSTRAINT chef_profiles_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drivers_user_id_fkey'
      AND conrelid = 'public.drivers'::regclass
  ) THEN
    ALTER TABLE drivers VALIDATE CONSTRAINT drivers_user_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_user_id_fkey'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE customers VALIDATE CONSTRAINT customers_user_id_fkey;
  END IF;
END $$;
