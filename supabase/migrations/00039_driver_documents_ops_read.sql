-- =============================================================================
-- 00039_driver_documents_ops_read.sql
--
-- Closes the gap surfaced by docs/RLS_AUDIT_2026-05-18.md: driver_documents
-- previously only had the driver-self policy ("Drivers can manage own
-- documents" from 00002_rls_policies.sql:272), which prevented ops/support
-- staff from reading driver-uploaded licence + insurance via PostgREST.
--
-- Ops driver-approval flow (Gate 5 of docs/PILOT_CHEF_LAUNCH_PLAN_2026-05-14.md)
-- has been relying on the engine's admin-client bypass for document review.
-- This migration replaces that implicit bypass with an explicit policy so the
-- access path is auditable.
--
-- Additive change: the existing driver-self FOR ALL policy stays untouched.
-- This migration adds a single FOR SELECT policy for platform staff +
-- still-owner drivers. Rollback = DROP POLICY "Ops can read driver documents".
-- =============================================================================

DROP POLICY IF EXISTS "Ops can read driver documents" ON driver_documents;
CREATE POLICY "Ops can read driver documents" ON driver_documents
  FOR SELECT TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_documents.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Ops can read driver documents" ON driver_documents IS
  'Allows platform-staff roles (ops_*, finance_*, support_agent, super_admin) to SELECT driver_documents rows for the driver-approval workflow (PILOT_CHEF_LAUNCH_PLAN Gate 5). Drivers retain self-ALL access via the older "Drivers can manage own documents" policy. See docs/RLS_AUDIT_2026-05-18.md.';
