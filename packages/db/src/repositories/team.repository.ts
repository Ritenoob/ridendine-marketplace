import type { SupabaseClient } from '../client/types';

// ==========================================
// TEAM REPOSITORY
// `platform_users` — the ops/finance/support staff directory used by
// ops-admin auth checks and team management.
// ==========================================

export interface PlatformUserRow {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface PlatformUserRoleRef {
  id: string;
  role: string;
}

export interface PlatformUserNameRef {
  user_id: string;
  name: string | null;
  role: string;
}

export interface PlatformUserInsert {
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

/** Active platform user (id + role) for an auth user id, or null when none. */
export async function getActivePlatformUserByUserId(
  client: SupabaseClient,
  userId: string
): Promise<PlatformUserRoleRef | null> {
  const { data, error } = await client
    .from('platform_users')
    .select('id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as PlatformUserRoleRef;
}

/** All platform users, newest first. */
export async function listPlatformUsers(
  client: SupabaseClient
): Promise<PlatformUserRow[]> {
  const { data, error } = await client
    .from('platform_users')
    .select('id, user_id, email, name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PlatformUserRow[];
}

/** Name/role refs for the given auth user ids (activity attribution). */
export async function listPlatformUserNameRefs(
  client: SupabaseClient,
  userIds: string[]
): Promise<PlatformUserNameRef[]> {
  const { data, error } = await client
    .from('platform_users')
    .select('user_id, name, role')
    .in('user_id', userIds as never[]);

  if (error) throw error;
  return (data ?? []) as unknown as PlatformUserNameRef[];
}

/** Create a platform_users record for a newly provisioned staff member. */
export async function insertPlatformUser(
  client: SupabaseClient,
  input: PlatformUserInsert
): Promise<void> {
  const { error } = await client.from('platform_users').insert(input as never);
  if (error) throw error;
}

/** Patch role and/or active flag on a platform user. */
export async function updatePlatformUser(
  client: SupabaseClient,
  id: string,
  update: { role?: string; is_active?: boolean }
): Promise<void> {
  const { error } = await client
    .from('platform_users')
    .update(update as never)
    .eq('id', id);

  if (error) throw error;
}
