-- ============================================================================
-- 00034_restore_user_id_fks.sql
-- Restore foreign-key integrity from chef_profiles / drivers / customers
-- to auth.users(id), dropped by 00030_seed_data_user_id_nullable.sql.
--
-- Context: 00030 dropped the FKs (and made user_id nullable) so that seed
-- data could pre-create chef/driver/customer rows without a corresponding
-- auth.users entry. That worked for seeds but stripped the production-grade
-- guarantee that user_id is either NULL or references a real auth user.
--
-- Resolution: re-add each FK with ON DELETE SET NULL, preserving the
-- "admin-created prospective record with NULL user_id" use case while
-- restoring referential integrity for the linked rows.
--
-- Safe-by-default: NOT VALID skips validation of existing rows. After this
-- migration applies you can run:
--   ALTER TABLE chef_profiles VALIDATE CONSTRAINT chef_profiles_user_id_fkey;
--   ALTER TABLE drivers       VALIDATE CONSTRAINT drivers_user_id_fkey;
--   ALTER TABLE customers     VALIDATE CONSTRAINT customers_user_id_fkey;
-- to enforce on existing rows too — but only after confirming via:
--   SELECT t.id, t.user_id FROM <table> t
--   LEFT JOIN auth.users u ON u.id = t.user_id
--   WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- returns zero rows. If it returns rows, decide whether to NULL out user_id
-- or repair before validating.
-- ============================================================================

ALTER TABLE chef_profiles DROP CONSTRAINT IF EXISTS chef_profiles_user_id_fkey;
ALTER TABLE chef_profiles
  ADD CONSTRAINT chef_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_user_id_fkey;
ALTER TABLE drivers
  ADD CONSTRAINT drivers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE customers
  ADD CONSTRAINT customers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  NOT VALID;
