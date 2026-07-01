import type { SupabaseClient } from '../client/types';

export type DriverNotificationPreferencesQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type DriverNotificationPreferencesRow = {
  preferences: unknown;
};

export async function getDriverNotificationPreferencesRow(
  client: SupabaseClient,
  driverId: string
): Promise<DriverNotificationPreferencesQueryResult<DriverNotificationPreferencesRow>> {
  const result = await (client as { from: (table: string) => any })
    .from('driver_notification_preferences')
    .select('preferences')
    .eq('driver_id', driverId)
    .maybeSingle();
  return result as unknown as DriverNotificationPreferencesQueryResult<DriverNotificationPreferencesRow>;
}

export async function upsertDriverNotificationPreferencesRow(
  client: SupabaseClient,
  input: {
    driverId: string;
    preferences: unknown;
    updatedAt: string;
  }
): Promise<DriverNotificationPreferencesQueryResult<DriverNotificationPreferencesRow>> {
  const result = await (client as { from: (table: string) => any })
    .from('driver_notification_preferences')
    .upsert(
      {
        driver_id: input.driverId,
        preferences: input.preferences,
        updated_at: input.updatedAt,
      },
      { onConflict: 'driver_id' }
    )
    .select('preferences')
    .single();
  return result as unknown as DriverNotificationPreferencesQueryResult<DriverNotificationPreferencesRow>;
}
