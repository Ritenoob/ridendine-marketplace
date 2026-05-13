-- ============================================================================
-- 00031_security_hardening.sql
-- Pre-beta security + integrity hardening.
-- Resolves REVIEW_2026-05-13.md findings: D2, D3, D4, D9, D11.
--
-- Safe-by-default patterns used:
--   * FK adds use NOT VALID so existing orphan rows do not block the migration.
--     New writes are enforced immediately; existing data can be validated later
--     with `ALTER TABLE ... VALIDATE CONSTRAINT ...` after running the orphan
--     audit queries documented at the bottom of this file.
--   * DROP POLICY IF EXISTS / DROP CONSTRAINT IF EXISTS for idempotency.
--   * Policies are added with explicit names so they can be revisited.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- D2 — Remove the audit-forging policy.
-- Original (migration 00010) granted FOR INSERT TO authenticated WITH CHECK (true),
-- which let any signed-in user write arbitrary audit_logs rows (including
-- impersonating super_admin).
-- After this drop, only service_role and ops policies remain. App writes that
-- depend on authenticated-user inserts must move to a SECURITY DEFINER RPC
-- or to the audit trigger path.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_insert_all" ON audit_logs;


-- ----------------------------------------------------------------------------
-- D4 — Add missing referential integrity on orders.
-- Original (migration 00001) declared customer_id and storefront_id as NOT NULL UUID
-- but omitted FK constraints. Orphans become possible if a customer/storefront
-- is hard-deleted. RESTRICT is correct: you should not be able to delete a
-- customer or storefront that has orders attached.
-- ----------------------------------------------------------------------------
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES customers(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_storefront_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_storefront_id_fkey
  FOREIGN KEY (storefront_id)
  REFERENCES chef_storefronts(id)
  ON DELETE RESTRICT
  NOT VALID;


-- ----------------------------------------------------------------------------
-- D11 — Soften ledger_entries.order_id FK so orders can be deleted without
-- corrupting the ledger.
-- Original FK (migration 00007) has default NO ACTION; combined with the
-- nullable column (migration 00020), the right semantic is ON DELETE SET NULL.
-- Payout-run debit entries and refund reversal entries do not always have a
-- single order_id, so NULL is a valid value going forward.
-- ----------------------------------------------------------------------------
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_order_id_fkey;
ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;


-- ----------------------------------------------------------------------------
-- D3 — Add explicit RLS policies on menu_item_availability.
-- Original (migration 00003) enabled RLS but never declared policies, leaving
-- the table effectively unreadable to anon/authenticated. The customer
-- marketplace needs public read for "is this item available right now?"
-- decisions, and chefs need write access for their own items.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view menu item availability" ON menu_item_availability;
CREATE POLICY "Public can view menu item availability"
  ON menu_item_availability
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
      WHERE menu_items.id = menu_item_availability.menu_item_id
        AND chef_storefronts.is_active = true
    )
  );

DROP POLICY IF EXISTS "Chefs manage their own menu availability" ON menu_item_availability;
CREATE POLICY "Chefs manage their own menu availability"
  ON menu_item_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
      JOIN chef_profiles ON chef_profiles.id = chef_storefronts.chef_id
      WHERE menu_items.id = menu_item_availability.menu_item_id
        AND chef_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items
      JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
      JOIN chef_profiles ON chef_profiles.id = chef_storefronts.chef_id
      WHERE menu_items.id = menu_item_availability.menu_item_id
        AND chef_profiles.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- D9 — Allow chefs to manage option values on their own menu items.
-- Original (migrations 00002, 00003) only created a public-read policy.
-- Chefs could not insert/update/delete option values via RLS — they had to
-- rely on service-role writes from API routes. This adds a tight chef-write
-- policy that mirrors the menu_item_option_values public-read shape.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Chefs manage their own option values" ON menu_item_option_values;
CREATE POLICY "Chefs manage their own option values"
  ON menu_item_option_values
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_item_options
      JOIN menu_items ON menu_items.id = menu_item_options.menu_item_id
      JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
      JOIN chef_profiles ON chef_profiles.id = chef_storefronts.chef_id
      WHERE menu_item_options.id = menu_item_option_values.option_id
        AND chef_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_item_options
      JOIN menu_items ON menu_items.id = menu_item_options.menu_item_id
      JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
      JOIN chef_profiles ON chef_profiles.id = chef_storefronts.chef_id
      WHERE menu_item_options.id = menu_item_option_values.option_id
        AND chef_profiles.user_id = auth.uid()
    )
  );


-- ============================================================================
-- POST-MIGRATION CLEANUP CHECKLIST
-- ============================================================================
-- After this migration applies, run these audit queries against your Supabase
-- project and act on the results. Each query returns rows IFF you have a
-- problem that the NOT VALID constraints are masking.
--
-- 1) Orphan orders (no matching customer):
--    SELECT o.id, o.customer_id FROM orders o
--    LEFT JOIN customers c ON c.id = o.customer_id
--    WHERE c.id IS NULL;
--
-- 2) Orphan orders (no matching storefront):
--    SELECT o.id, o.storefront_id FROM orders o
--    LEFT JOIN chef_storefronts s ON s.id = o.storefront_id
--    WHERE s.id IS NULL;
--
-- If both queries return zero rows, validate the constraints:
--    ALTER TABLE orders VALIDATE CONSTRAINT orders_customer_id_fkey;
--    ALTER TABLE orders VALIDATE CONSTRAINT orders_storefront_id_fkey;
--
-- If they return rows, decide per-row whether to:
--   (a) hard-delete the orphan order (data was already broken), or
--   (b) repair by inserting the missing parent (preferred if you have history).
-- ============================================================================
