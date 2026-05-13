-- ============================================================================
-- 00033_push_subscriptions_restore.sql
-- Restore the push_subscriptions table.
--
-- Originally declared in 00004_additions.sql (CREATE TABLE IF NOT EXISTS) but
-- observed to be absent from the live ref (PostgREST HTTP 404 against
-- /rest/v1/push_subscriptions during the 2026-05-13 stabilization pass).
-- Almost certainly dropped manually via the Supabase dashboard at some point.
-- Without this table the web push subscription route
-- (apps/web/src/app/api/notifications/subscribe/route.ts) fails silently
-- on every customer that enables browser push notifications.
--
-- This migration is idempotent — CREATE TABLE IF NOT EXISTS + IF EXISTS
-- guards on the policies, so it is safe to re-run.
--
-- One adjustment vs. the 00004 declaration: added updated_at column. The
-- subscribe route's upsert writes updated_at; the original schema had no
-- such column. Adding it as nullable would also work; using NOT NULL with
-- default keeps the row contract simple.
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_owner_select" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_select"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_owner_insert" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_insert"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_owner_update" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_update"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_owner_delete" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner_delete"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
