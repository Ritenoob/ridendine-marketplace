-- ============================================================================
-- 00030_seed_data_user_id_nullable.sql
-- Adopt previously-stray supabase/make_userid_nullable.sql into the migration system.
--
-- Background: dev/staging seed data inserts chef_profiles/drivers/customers rows
-- without corresponding auth.users entries. Original FK constraint requires a
-- valid auth.users.id, blocking the seed. This migration drops that NOT NULL +
-- FK requirement so the seed can populate fake test users.
--
-- WARNING (production): once applied, NOTHING enforces that a chef/driver/customer
-- row references a real Supabase auth user. The application layer is responsible
-- for ensuring user_id is set correctly when real users sign up. See REVIEW_2026-05-13.md
-- finding D1 for the longer-term fix (rework seed.sql to create auth.users first).
--
-- Idempotent: ALTER COLUMN DROP NOT NULL is a no-op if already nullable;
-- DROP CONSTRAINT IF EXISTS skips silently if already dropped.
-- ============================================================================

-- Make user_id nullable for admin-created records
ALTER TABLE chef_profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;

-- Drop foreign key constraints that prevent creating records without auth users
ALTER TABLE chef_profiles DROP CONSTRAINT IF EXISTS chef_profiles_user_id_fkey;
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_user_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
