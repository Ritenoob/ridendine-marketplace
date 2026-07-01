import { getActivePlatformUserByUserId, type SupabaseClient } from '@ridendine/db';

const DRIVER_APP_PLATFORM_ROLES = new Set(['super_admin']);

export async function getDriverAppPlatformRole(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const platformUser = await getActivePlatformUserByUserId(client, userId);
  const role = typeof platformUser?.role === 'string' ? platformUser.role : null;
  return role && DRIVER_APP_PLATFORM_ROLES.has(role) ? role : null;
}
