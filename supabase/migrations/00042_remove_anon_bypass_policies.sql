-- ============================================================================
-- 00042_remove_anon_bypass_policies.sql
-- ----------------------------------------------------------------------------
-- Removes all overly-permissive anonymous read policies that were created in
-- 00005_anon_read_policies.sql for BYPASS_AUTH development mode.
--
-- Why these must be removed: BYPASS_AUTH mode has been removed from all four
-- Ridendine applications. These USING (true) policies grant the anon Postgres
-- role unrestricted SELECT access to sensitive tables including orders,
-- customers, drivers, and deliveries — a serious data-exposure risk in
-- production. Leaving them in place violates the principle of least privilege
-- and contradicts the RLS hardening work done in 00017_phase_b_security_rls_hardening.sql
-- and 00031_security_hardening.sql.
--
-- Action: DROP POLICY IF EXISTS is used throughout so this migration is
--         idempotent and safe to run even if some policies were already removed.
--
-- DO NOT recreate these policies. Any future anonymous-read requirements must
-- be scoped with a real USING expression (e.g. chef_storefronts active-only).
-- ============================================================================

BEGIN;

-- Orders
DROP POLICY IF EXISTS "Anon can view all orders" ON orders;

-- Order items (policy was created with both name variants — drop both)
DROP POLICY IF EXISTS "Anon can view all order_items" ON order_items;
DROP POLICY IF EXISTS "Anon can view all order items" ON order_items;

-- Deliveries
DROP POLICY IF EXISTS "Anon can view all deliveries" ON deliveries;

-- Delivery events
DROP POLICY IF EXISTS "Anon can view all delivery_events" ON delivery_events;

-- Drivers
DROP POLICY IF EXISTS "Anon can view all drivers" ON drivers;

-- Driver presence (policy was created with both name variants — drop both)
DROP POLICY IF EXISTS "Anon can view all driver_presence" ON driver_presence;
DROP POLICY IF EXISTS "Anon can view driver presence" ON driver_presence;

-- Customers
DROP POLICY IF EXISTS "Anon can view all customers" ON customers;

-- Customer addresses (policy was created with both name variants — drop both)
DROP POLICY IF EXISTS "Anon can view all customer_addresses" ON customer_addresses;
DROP POLICY IF EXISTS "Anon can view all customer addresses" ON customer_addresses;

-- Chef profiles (policy was created with both name variants — drop both)
DROP POLICY IF EXISTS "Anon can view all chef_profiles" ON chef_profiles;
DROP POLICY IF EXISTS "Anon can view all chef profiles" ON chef_profiles;

-- Reviews
DROP POLICY IF EXISTS "Anon can view all reviews" ON reviews;

-- Support tickets (policy was created with both name variants — drop both)
DROP POLICY IF EXISTS "Anon can view all support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "Anon can view support tickets" ON support_tickets;

-- Notifications (may not exist but drop is idempotent)
DROP POLICY IF EXISTS "Anon can view all notifications" ON notifications;

COMMIT;
