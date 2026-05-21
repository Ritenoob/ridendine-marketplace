-- Production readiness hardening:
-- 1. Allow the canonical partial-refund payment status written by the engine.
-- 2. Validate order customer/storefront foreign keys after explicitly blocking
--    migration if orphaned orders exist.

BEGIN;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%payment_status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'partially_refunded'
  ));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.customer_id IS NOT NULL
      AND c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate orders_customer_id_fkey: orphaned orders.customer_id values exist';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN chef_storefronts s ON s.id = o.storefront_id
    WHERE o.storefront_id IS NOT NULL
      AND s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot validate orders_storefront_id_fkey: orphaned orders.storefront_id values exist';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_customer_id_fkey'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE orders VALIDATE CONSTRAINT orders_customer_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_storefront_id_fkey'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE orders VALIDATE CONSTRAINT orders_storefront_id_fkey;
  END IF;
END $$;

COMMIT;
