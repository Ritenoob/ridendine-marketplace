-- ============================================================================
-- 00041_engine_status_check.sql
-- ----------------------------------------------------------------------------
-- Adds a CHECK constraint on orders.engine_status to enforce the canonical
-- EngineOrderStatus enum values at the database layer.
--
-- Why: The engine_status column was added without a database-level constraint,
--      meaning invalid status strings could be written directly via SQL or
--      service-role clients that bypass application-layer validation.
--      Enforcing the full EngineOrderStatus enum in the DB closes this gap and
--      makes schema drift immediately visible via failed migrations rather than
--      silent data corruption.
--
-- Pattern: Drop existing constraint if present (idempotent), then add new one.
--
-- Source of truth for valid values: EngineOrderStatus enum (packages/types).
-- ============================================================================

BEGIN;

-- Drop existing engine_status constraint if any (idempotent).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%engine_status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- Add CHECK constraint covering all EngineOrderStatus enum values.
ALTER TABLE orders
  ADD CONSTRAINT orders_engine_status_check
  CHECK (engine_status IN (
    'draft',
    'checkout_pending',
    'payment_authorized',
    'payment_failed',
    'pending',
    'accepted',
    'rejected',
    'preparing',
    'ready',
    'dispatch_pending',
    'driver_offered',
    'driver_assigned',
    'driver_en_route_pickup',
    'picked_up',
    'driver_en_route_dropoff',
    'driver_en_route_customer',
    'delivered',
    'completed',
    'cancel_requested',
    'cancelled',
    'refund_pending',
    'refunded',
    'partially_refunded',
    'failed',
    'exception'
  ));

COMMIT;
