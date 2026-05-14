-- ============================================================================
-- 00035_chef_profiles_public_read.sql
-- Allow authenticated customers (and anon) to read approved chef_profiles.
--
-- Root cause for "no chefs available" when logged in as a customer:
-- - Anon has policy "Anon can view all chef profiles" (00005) → can SELECT.
-- - Chefs have "Chefs can manage own profile" → own row only.
-- - Ops have "Ops can view all chefs" → all rows.
-- - Customers (authenticated, not ops) had NO matching SELECT policy.
--   Postgres RLS: no matching policy = row invisible. So the embedded
--   chef_profiles!inner join in getActiveStorefronts returned 0 rows for
--   every authenticated customer, regardless of which storefronts existed.
--
-- This policy mirrors the public-read policy on chef_storefronts (approved-only)
-- and lets the customer marketplace render once a customer signs in.
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view all chef profiles" ON chef_profiles;
DROP POLICY IF EXISTS "Public can view approved chef profiles" ON chef_profiles;

CREATE POLICY "Public can view approved chef profiles"
  ON chef_profiles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');
