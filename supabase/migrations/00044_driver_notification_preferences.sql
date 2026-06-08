-- Phase 6 driver operations: DB-backed driver notification preferences.

CREATE TABLE IF NOT EXISTS driver_notification_preferences (
  driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT driver_notification_preferences_object_chk
    CHECK (jsonb_typeof(preferences) = 'object')
);

ALTER TABLE driver_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driver_notification_preferences_driver_select
  ON driver_notification_preferences;
CREATE POLICY driver_notification_preferences_driver_select
  ON driver_notification_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM drivers
      WHERE drivers.id = driver_notification_preferences.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS driver_notification_preferences_driver_insert
  ON driver_notification_preferences;
CREATE POLICY driver_notification_preferences_driver_insert
  ON driver_notification_preferences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM drivers
      WHERE drivers.id = driver_notification_preferences.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS driver_notification_preferences_driver_update
  ON driver_notification_preferences;
CREATE POLICY driver_notification_preferences_driver_update
  ON driver_notification_preferences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM drivers
      WHERE drivers.id = driver_notification_preferences.driver_id
        AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM drivers
      WHERE drivers.id = driver_notification_preferences.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS driver_notification_preferences_ops_all
  ON driver_notification_preferences;
CREATE POLICY driver_notification_preferences_ops_all
  ON driver_notification_preferences
  FOR ALL
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_driver_notification_preferences_updated_at
  ON driver_notification_preferences;
CREATE TRIGGER update_driver_notification_preferences_updated_at
  BEFORE UPDATE ON driver_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
