import type { SupabaseClient, TableQueryBuilder } from '../client/types';

export function notificationsTable(client: SupabaseClient): TableQueryBuilder {
  return client.from('notifications');
}

export function pushSubscriptionsTable(client: SupabaseClient): TableQueryBuilder {
  return client.from('push_subscriptions');
}

// ==========================================
// NOTIFICATION REPOSITORY
// In-app notification inserts plus announcement audience resolution.
// ==========================================

export type AnnouncementAudience =
  | 'all_customers'
  | 'all_chefs'
  | 'all_drivers'
  | 'all_ops';

export interface NotificationInsert {
  user_id: string;
  type: string;
  title: string;
  body: string;
  message: string;
  data?: Record<string, unknown> | null;
}

type UserIdRow = { user_id: string };

/**
 * Resolve the auth user ids behind an announcement audience.
 * `all_ops` is restricted to active platform users.
 */
export async function listAnnouncementAudienceUserIds(
  client: SupabaseClient,
  audience: AnnouncementAudience
): Promise<string[]> {
  if (audience === 'all_customers') {
    const { data, error } = await client.from('customers').select('user_id');
    if (error) throw error;
    return ((data || []) as unknown as UserIdRow[]).map((row) => row.user_id);
  }

  if (audience === 'all_chefs') {
    const { data, error } = await client.from('chef_profiles').select('user_id');
    if (error) throw error;
    return ((data || []) as unknown as UserIdRow[]).map((row) => row.user_id);
  }

  if (audience === 'all_drivers') {
    const { data, error } = await client.from('drivers').select('user_id');
    if (error) throw error;
    return ((data || []) as unknown as UserIdRow[]).map((row) => row.user_id);
  }

  const { data, error } = await client
    .from('platform_users')
    .select('user_id')
    .eq('is_active', true);
  if (error) throw error;
  return ((data || []) as unknown as UserIdRow[]).map((row) => row.user_id);
}

/** Insert a single notification row. */
export async function insertNotification(
  client: SupabaseClient,
  notification: NotificationInsert
): Promise<void> {
  const { error } = await client.from('notifications').insert(notification as never);
  if (error) throw error;
}

/** Insert a batch of notification rows (callers chunk to <= 100 per call). */
export async function insertNotifications(
  client: SupabaseClient,
  notifications: NotificationInsert[]
): Promise<void> {
  const { error } = await client.from('notifications').insert(notifications as never);
  if (error) throw error;
}
