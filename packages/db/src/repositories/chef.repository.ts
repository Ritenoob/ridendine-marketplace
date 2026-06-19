import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type ChefProfile = Tables<'chef_profiles'>;
export interface ChefStorefrontGovernanceSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_featured: boolean;
}

export interface ChefProfileWithStorefronts extends ChefProfile {
  chef_storefronts: ChefStorefrontGovernanceSummary[] | null;
}

export interface ChefGovernanceStorefrontDetail extends ChefStorefrontGovernanceSummary {
  average_rating: number | null;
  total_reviews: number | null;
  cuisine_types: string[] | null;
}

export interface ChefGovernanceDetail extends ChefProfile {
  chef_storefronts: ChefGovernanceStorefrontDetail[] | null;
  order_count: number;
  total_revenue: number;
}

type DeliveredOrderTotalRow = {
  total: number | null;
};

export async function getChefByUserId(
  client: SupabaseClient,
  userId: string
): Promise<ChefProfile | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getChefById(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getChefWithStorefronts(
  client: SupabaseClient,
  id: string
): Promise<ChefProfileWithStorefronts | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug,
        is_active,
        is_featured
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getChefGovernanceDetail(
  client: SupabaseClient,
  id: string
): Promise<ChefGovernanceDetail | null> {
  const { data: chef, error } = await client
    .from('chef_profiles')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug,
        is_active,
        is_featured,
        average_rating,
        total_reviews,
        cuisine_types
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const storefronts = (chef.chef_storefronts ?? []) as ChefGovernanceStorefrontDetail[];
  const storefrontIds = storefronts.map((storefront) => storefront.id);

  if (storefrontIds.length === 0) {
    return {
      ...chef,
      chef_storefronts: storefronts,
      order_count: 0,
      total_revenue: 0,
    };
  }

  const { data: orders, error: ordersError } = await client
    .from('orders')
    .select('total')
    .in('storefront_id', storefrontIds)
    .eq('status', 'delivered');

  if (ordersError) throw ordersError;

  return {
    ...chef,
    chef_storefronts: storefronts,
    order_count: orders?.length ?? 0,
    total_revenue: ((orders ?? []) as DeliveredOrderTotalRow[]).reduce(
      (sum, order) => sum + (order.total ?? 0),
      0
    ),
  };
}

export async function createChefProfile(
  client: SupabaseClient,
  profile: Omit<ChefProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<ChefProfile> {
  const { data, error } = await client
    .from('chef_profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChefProfile(
  client: SupabaseClient,
  id: string,
  updates: Partial<ChefProfile>
): Promise<ChefProfile> {
  const { data, error } = await client
    .from('chef_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingChefApprovals(
  client: SupabaseClient
): Promise<ChefProfile[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function listChefsWithStorefronts(
  client: SupabaseClient,
  options: { status?: string; page?: number; limit?: number } = {}
): Promise<{ items: ChefProfileWithStorefronts[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let countQuery = client
    .from('chef_profiles')
    .select('*', { count: 'exact', head: true });

  let dataQuery = client
    .from('chef_profiles')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug,
        is_active,
        is_featured
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([countQuery, dataQuery]);

  if (countError) throw countError;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

export async function approveChef(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile> {
  return updateChefProfile(client, id, { status: 'approved' });
}

export async function rejectChef(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile> {
  return updateChefProfile(client, id, { status: 'rejected' });
}

// ==========================================
// OPS-ADMIN READ MODELS
// ==========================================

export interface ChefDisplayNameRef {
  id: string;
  display_name: string | null;
}

export interface ChefProfileRef extends ChefDisplayNameRef {
  user_id: string;
}

/** `id, display_name` for the given chef ids (trend leaderboards). */
export async function listChefDisplayNames(
  client: SupabaseClient,
  chefIds: string[]
): Promise<ChefDisplayNameRef[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('id, display_name')
    .in('id', chefIds as never[]);

  if (error) throw error;
  return (data ?? []) as unknown as ChefDisplayNameRef[];
}

/** `id, display_name, user_id` for the given chef ids (payout views). */
export async function listChefProfileRefs(
  client: SupabaseClient,
  chefIds: string[]
): Promise<ChefProfileRef[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('id, display_name, user_id')
    .in('id', chefIds as never[]);

  if (error) throw error;
  return (data || []) as unknown as ChefProfileRef[];
}

/** Single chef display name, or null when missing. */
export async function getChefDisplayName(
  client: SupabaseClient,
  chefId: string
): Promise<{ display_name: string | null } | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('display_name')
    .eq('id', chefId)
    .maybeSingle();

  if (error) throw error;
  return (data as { display_name: string | null } | null) ?? null;
}

export interface ChefDocumentRow {
  id: string;
  document_type: string;
  document_url: string | null;
  status: string;
  expires_at: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Compliance documents for one chef, newest first. */
export async function listChefDocuments(
  client: SupabaseClient,
  chefId: string
): Promise<ChefDocumentRow[]> {
  const { data, error } = await client
    .from('chef_documents')
    .select('id, document_type, document_url, status, expires_at, notes, reviewed_by, reviewed_at, created_at, updated_at')
    .eq('chef_id', chefId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ChefDocumentRow[];
}

export interface ChefComplianceProfileRow {
  id: string;
  display_name: string;
  status: string;
  chef_documents: ChefDocumentRow[] | null;
}

/** Chefs with embedded compliance documents (compliance queue). */
export async function listChefComplianceProfiles(
  client: SupabaseClient,
  limit = 200
): Promise<ChefComplianceProfileRow[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select(`
      id,
      display_name,
      status,
      chef_documents (
        id,
        document_type,
        document_url,
        status,
        expires_at,
        notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ChefComplianceProfileRow[];
}

export interface ChefDeliveryZoneRow {
  id: string;
  name: string;
  radius_km: number | null;
  delivery_fee: number | null;
  min_order_for_free_delivery: number | null;
  is_active: boolean;
  storefront_id: string;
}

/** Delivery zones across a set of storefronts (chef governance detail). */
export async function listChefDeliveryZonesByStorefronts(
  client: SupabaseClient,
  storefrontIds: string[]
): Promise<ChefDeliveryZoneRow[]> {
  const { data, error } = await client
    .from('chef_delivery_zones')
    .select('id, name, radius_km, delivery_fee, min_order_for_free_delivery, is_active, storefront_id')
    .in('storefront_id', storefrontIds as never[]);

  if (error) throw error;
  return (data || []) as unknown as ChefDeliveryZoneRow[];
}

export interface ChefSearchRow {
  id: string;
  display_name: string;
  status: string;
}

/** Chefs whose display name matches `q` (global search). */
export async function searchChefsByName(
  client: SupabaseClient,
  q: string,
  limit = 5
): Promise<ChefSearchRow[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('id, display_name, status')
    .ilike('display_name', `%${q}%`)
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as ChefSearchRow[];
}

export interface ChefExportRow {
  display_name: string;
  phone: string | null;
  status: string;
  created_at: string;
}

/** `lat, lng` of the chef kitchen serving a storefront, or null when unset. */
export async function getKitchenCoordinatesByStorefront(
  client: SupabaseClient,
  storefrontId: string
): Promise<{ lat: number | null; lng: number | null } | null> {
  const { data, error } = await client
    .from('chef_kitchens')
    .select('lat, lng')
    .eq('storefront_id' as never, storefrontId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as { lat: number | null; lng: number | null } | null) ?? null;
}

/** Chef rows for CSV export, newest first. */
export async function listChefExportRows(
  client: SupabaseClient
): Promise<ChefExportRow[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('display_name, phone, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as ChefExportRow[];
}
