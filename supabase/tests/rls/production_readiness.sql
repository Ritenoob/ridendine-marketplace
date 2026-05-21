-- ==========================================
-- pgTAP production-readiness guardrails
--
-- Run with: supabase test db
-- ==========================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(13);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.orders'::regclass),
  'orders has RLS enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.deliveries'::regclass),
  'deliveries has RLS enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ledger_entries'::regclass),
  'ledger_entries has RLS enabled'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.refund_cases'::regclass),
  'refund_cases has RLS enabled'
);

SELECT is_empty(
  $$
    SELECT tablename || ':' || policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'orders',
        'order_items',
        'deliveries',
        'driver_locations',
        'ledger_entries',
        'refund_cases',
        'payout_runs',
        'payout_run_items',
        'platform_users'
      )
      AND roles::text ILIKE '%anon%'
  $$,
  'sensitive operational tables do not expose anon policies'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_customer_id_fkey'
      AND convalidated = TRUE
  ),
  'orders_customer_id_fkey is validated'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_storefront_id_fkey'
      AND convalidated = TRUE
  ),
  'orders_storefront_id_fkey is validated'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_payment_status_check'
      AND pg_get_constraintdef(oid) ILIKE '%partially_refunded%'
  ),
  'orders_payment_status_check allows partially_refunded'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND (
        COALESCE(qual, '') ILIKE '%auth.uid%'
        OR COALESCE(qual, '') ILIKE '%is_platform_staff%'
        OR COALESCE(with_check, '') ILIKE '%auth.uid%'
        OR COALESCE(with_check, '') ILIKE '%is_platform_staff%'
      )
  ),
  'orders policies are tied to authenticated users or platform staff'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ledger_entries'
      AND COALESCE(qual, '') ILIKE '%is_finance_staff%'
  ),
  'ledger_entries read access uses finance staff helper'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'driver_locations'
      AND COALESCE(qual, '') ILIKE '%is_platform_staff%'
  ),
  'driver location ops access uses platform staff helper'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND COALESCE(qual, '') ILIKE '%is_support_staff%'
  ),
  'support ticket platform access uses support staff helper'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'refund_cases'
      AND (
        COALESCE(qual, '') ILIKE '%is_support_staff%'
        OR COALESCE(qual, '') ILIKE '%is_finance_staff%'
        OR COALESCE(qual, '') ILIKE '%is_platform_staff%'
        OR (
          COALESCE(qual, '') ILIKE '%platform_users%'
          AND COALESCE(qual, '') ILIKE '%finance_admin%'
          AND COALESCE(qual, '') ILIKE '%ops_manager%'
        )
      )
  ),
  'refund case access is limited to staff roles'
);

SELECT * FROM finish();

ROLLBACK;
