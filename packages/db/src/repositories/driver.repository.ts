import type { SupabaseClient } from '../client/types';
import type { Tables, TablesInsert } from '../generated/database.types';

export type Driver = Tables<'drivers'>;
export type DriverInsert = TablesInsert<'drivers'>;
export interface OpsDriverListItem extends Driver {
  driver_presence: {
    status: 'offline' | 'online' | 'busy';
    updated_at: string;
  } | null;
}

export interface OpsDriverDetail extends Driver {
  driver_presence: {
    status: string;
    last_location_lat: number | null;
    last_location_lng: number | null;
    last_updated_at: string;
  } | null;
  recent_deliveries: Array<{
    id: string;
    status: string;
    driver_payout: number | null;
    created_at: string;
    actual_dropoff_at: string | null;
    order: {
      id: string;
      order_number: string;
      total: number;
    } | null;
  }>;
  stats: {
    completedDeliveries: number;
    activeDeliveries: number;
    totalEarnings: number;
  };
}

type DriverStatsRow = {
  status: string;
  driver_payout: number | null;
};

export async function getDriverByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Driver | null> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getDriverById(
  client: SupabaseClient,
  id: string
): Promise<Driver | null> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createDriver(
  client: SupabaseClient,
  driver: Omit<DriverInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<Driver> {
  const { data, error } = await client
    .from('drivers')
    .insert(driver)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDriver(
  client: SupabaseClient,
  id: string,
  updates: Partial<Driver>
): Promise<Driver> {
  const { data, error } = await client
    .from('drivers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApprovedDrivers(
  client: SupabaseClient
): Promise<Driver[]> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

export async function listOpsDrivers(
  client: SupabaseClient,
  options: { status?: string; page?: number; limit?: number } = {}
): Promise<{ items: OpsDriverListItem[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let countQuery = client
    .from('drivers')
    .select('*', { count: 'exact', head: true });

  let dataQuery = client
    .from('drivers')
    .select(`
      *,
      driver_presence (
        status,
        updated_at
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
  // Cast: DB stores presence status as plain text; the exported interface
  // narrows it to the known 'offline' | 'online' | 'busy' values.
  return { items: (data ?? []) as OpsDriverListItem[], total: count ?? 0 };
}

export async function getOpsDriverDetail(
  client: SupabaseClient,
  driverId: string
): Promise<OpsDriverDetail | null> {
  const { data: driver, error } = await client
    .from('drivers')
    .select(`
      *,
      driver_presence (
        status,
        last_location_lat,
        last_location_lng,
        last_updated_at
      )
    `)
    .eq('id', driverId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { data: recentDeliveries, error: recentDeliveriesError } = await client
    .from('deliveries')
    .select(`
      id,
      status,
      driver_payout,
      created_at,
      actual_dropoff_at,
      order:orders (
        id,
        order_number,
        total
      )
    `)
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentDeliveriesError) throw recentDeliveriesError;

  const { data: deliveryStats, error: deliveryStatsError } = await client
    .from('deliveries')
    .select('status, driver_payout')
    .eq('driver_id', driverId);

  if (deliveryStatsError) throw deliveryStatsError;

  const deliveries = (recentDeliveries ?? []) as OpsDriverDetail['recent_deliveries'];
  const statsRows = (deliveryStats ?? []) as DriverStatsRow[];

  return {
    // Cast: generated driver_presence.last_updated_at is nullable; the
    // exported interface declares it non-null (pre-existing contract).
    ...(driver as Omit<OpsDriverDetail, 'recent_deliveries' | 'stats'>),
    recent_deliveries: deliveries,
    stats: {
      completedDeliveries: statsRows.filter(
        (row: DriverStatsRow) => row.status === 'delivered'
      ).length,
      activeDeliveries: statsRows.filter((row: DriverStatsRow) =>
        ['assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff'].includes(row.status)
      ).length,
      totalEarnings: statsRows.reduce(
        (sum: number, row: DriverStatsRow) =>
          sum + (row.status === 'delivered' ? row.driver_payout ?? 0 : 0),
        0
      ),
    },
  };
}

export async function getPendingDriverApprovals(
  client: SupabaseClient
): Promise<Driver[]> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function approveDriver(
  client: SupabaseClient,
  id: string
): Promise<Driver> {
  return updateDriver(client, id, { status: 'approved' });
}

export async function rejectDriver(
  client: SupabaseClient,
  id: string
): Promise<Driver> {
  return updateDriver(client, id, { status: 'rejected' });
}

// ==========================================
// OPS-ADMIN READ MODELS
// ==========================================

/** Exact count of drivers with the given approval status. */
export async function countDriversByStatus(
  client: SupabaseClient,
  status: string
): Promise<number> {
  const { count, error } = await client
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('status', status as never);

  if (error) throw error;
  return count ?? 0;
}

/** Exact count of drivers updated within [start, end] (id-projection count). */
export async function countDriversUpdatedBetween(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<number> {
  const { count, error } = await client
    .from('drivers')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', startIso)
    .lte('updated_at', endIso);

  if (error) throw error;
  return count ?? 0;
}

export interface DriverNameRef {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/** `id, first_name, last_name` for the given driver ids. */
export async function listDriverNameRefs(
  client: SupabaseClient,
  driverIds: string[]
): Promise<DriverNameRef[]> {
  const { data, error } = await client
    .from('drivers')
    .select('id, first_name, last_name')
    .in('id', driverIds as never[]);

  if (error) throw error;
  return (data ?? []) as unknown as DriverNameRef[];
}

/** Single driver name ref, or null when missing. */
export async function getDriverNameRef(
  client: SupabaseClient,
  driverId: string
): Promise<{ first_name: string | null; last_name: string | null } | null> {
  const { data, error } = await client
    .from('drivers')
    .select('first_name, last_name')
    .eq('id', driverId)
    .maybeSingle();

  if (error) throw error;
  return (data as { first_name: string | null; last_name: string | null } | null) ?? null;
}

export interface DriverDocumentRow {
  id: string;
  document_type: string;
  document_url?: string | null;
  status: string;
  expires_at: string | null;
  notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Compliance documents for one driver, newest first. */
export async function listDriverDocuments(
  client: SupabaseClient,
  driverId: string
): Promise<DriverDocumentRow[]> {
  const { data, error } = await client
    .from('driver_documents')
    .select('id, document_type, document_url, status, expires_at, notes, reviewed_by, reviewed_at, created_at, updated_at')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DriverDocumentRow[];
}

export interface DriverComplianceProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  driver_documents: DriverDocumentRow[] | null;
}

/** Drivers with embedded compliance documents (compliance queue). */
export async function listDriverComplianceProfiles(
  client: SupabaseClient,
  limit = 200
): Promise<DriverComplianceProfileRow[]> {
  const { data, error } = await client
    .from('drivers')
    .select(`
      id,
      first_name,
      last_name,
      status,
      driver_documents (
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
  return (data ?? []) as unknown as DriverComplianceProfileRow[];
}

export interface DriverComplianceDocRef {
  driver_id: string;
  document_type: string;
  status: string;
  expires_at: string | null;
}

/** Compliance doc refs across many drivers (live board readiness). */
export async function listDriverComplianceDocRefs(
  client: SupabaseClient,
  driverIds: string[],
  limit = 1000
): Promise<DriverComplianceDocRef[]> {
  const { data, error } = await client
    .from('driver_documents')
    .select('driver_id, document_type, status, expires_at')
    .in('driver_id', driverIds as never[])
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as DriverComplianceDocRef[];
}

export interface DriverPayoutAccountRef {
  driver_id: string;
  status: string | null;
  payouts_enabled: boolean | null;
  onboarding_completed_at: string | null;
}

/** Payout account refs across many drivers (live board readiness). */
export async function listDriverPayoutAccountRefs(
  client: SupabaseClient,
  driverIds: string[],
  limit = 1000
): Promise<DriverPayoutAccountRef[]> {
  const { data, error } = await client
    .from('driver_payout_accounts')
    .select('driver_id, status, payouts_enabled, onboarding_completed_at')
    .in('driver_id', driverIds as never[])
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as DriverPayoutAccountRef[];
}

type AnyRow = Record<string, any>;

/** Approved drivers with presence/location fields for the ops live map. */
export async function listLiveMapDrivers(
  client: SupabaseClient
): Promise<AnyRow[]> {
  const { data, error } = await client
    .from('drivers')
    .select(`
          id,
          first_name,
          last_name,
          driver_presence (
            status,
            last_location_lat,
            last_location_lng,
            last_location_at,
            last_location_update,
            updated_at
          )
        `)
    .eq('status', 'approved');

  if (error) throw error;
  return (data ?? []) as unknown as AnyRow[];
}

/** Approved drivers with full presence telemetry for the ops live board. */
export async function listOpsLiveBoardDrivers(
  client: SupabaseClient
): Promise<AnyRow[]> {
  const { data, error } = await client
    .from('drivers')
    .select(`
          id, first_name, last_name, status, updated_at,
          driver_presence (
            status, updated_at,
            current_lat, current_lng,
            last_location_lat, last_location_lng,
            last_location_at, last_location_update
          )
        `)
    .eq('status', 'approved');

  if (error) throw error;
  return (data ?? []) as unknown as AnyRow[];
}

export interface DriverSearchRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

/** Drivers whose first/last name matches `q` (global search). */
export async function searchDriversByName(
  client: SupabaseClient,
  q: string,
  limit = 5
): Promise<DriverSearchRow[]> {
  const { data, error } = await client
    .from('drivers')
    .select('id, first_name, last_name, status')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as DriverSearchRow[];
}

export interface DriverExportRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  total_deliveries: number | null;
  rating: number | null;
  created_at: string;
}

/** Driver rows for CSV export, newest first. */
export async function listDriverExportRows(
  client: SupabaseClient
): Promise<DriverExportRow[]> {
  const { data, error } = await client
    .from('drivers')
    .select('first_name, last_name, email, phone, status, total_deliveries, rating, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as DriverExportRow[];
}

// ==========================================
// DRIVER OPERATIONS SNAPSHOT (ops driver detail)
// ==========================================

type OperationsQueryError = { message?: string; code?: string } | null;

export interface OpsDriverOperationsRawData {
  driver: AnyRow;
  presence: AnyRow | null;
  activeDeliveries: AnyRow[];
  openExceptions: AnyRow[];
  documents: AnyRow[];
  payoutAccount: AnyRow | null;
  platformAccount: AnyRow | null;
  shift: AnyRow | null;
}

function throwIfOperationsError(
  result: { error: OperationsQueryError },
  label: string
): void {
  if (result.error) {
    throw new Error(result.error.message ?? `${label} query failed`);
  }
}

/**
 * Raw data bundle behind the ops driver operations summary: driver row,
 * presence, active deliveries, open exceptions, compliance documents,
 * payout/platform accounts and (when on shift) the current shift row.
 * Returns null when the driver does not exist.
 */
export async function getOpsDriverOperationsRawData(
  client: SupabaseClient,
  driverId: string,
  options: {
    activeDeliveryStatuses: readonly string[];
    openExceptionStatuses: readonly string[];
  }
): Promise<OpsDriverOperationsRawData | null> {
  const [
    driverResult,
    presenceResult,
    activeDeliveriesResult,
    exceptionsResult,
    documentsResult,
    payoutAccountResult,
    platformAccountResult,
  ] = await Promise.all([
    client
      .from('drivers')
      .select('id, first_name, last_name, email, phone, status, vehicle_type, created_at, instant_payouts_enabled')
      .eq('id', driverId)
      .maybeSingle(),
    client
      .from('driver_presence')
      .select('status, current_shift_id, last_location_at, last_location_update, updated_at, current_lat, current_lng, last_location_lat, last_location_lng')
      .eq('driver_id', driverId)
      .maybeSingle(),
    client
      .from('deliveries')
      .select('id, order_id, status, updated_at, estimated_dropoff_at, pickup_address, dropoff_address, orders ( order_number )')
      .eq('driver_id', driverId)
      .in('status', options.activeDeliveryStatuses as never[])
      .order('updated_at', { ascending: false })
      .limit(25),
    client
      .from('order_exceptions')
      .select('id, exception_type, status, severity, title, created_at')
      .eq('driver_id', driverId)
      .in('status', options.openExceptionStatuses as never[])
      .order('created_at', { ascending: false })
      .limit(25),
    client
      .from('driver_documents')
      .select('id, document_type, status, expires_at')
      .eq('driver_id', driverId)
      .limit(100),
    client
      .from('driver_payout_accounts')
      .select('status, payouts_enabled, charges_enabled, onboarding_completed_at')
      .eq('driver_id', driverId)
      .maybeSingle(),
    client
      .from('platform_accounts')
      .select('balance_cents, pending_payout_cents, currency, updated_at')
      .eq('account_type', 'driver_payable')
      .eq('owner_id', driverId)
      .maybeSingle(),
  ]);

  throwIfOperationsError(driverResult, 'driver');
  if (!driverResult.data) return null;

  throwIfOperationsError(presenceResult, 'driver presence');
  throwIfOperationsError(activeDeliveriesResult, 'active deliveries');
  throwIfOperationsError(exceptionsResult, 'driver exceptions');
  throwIfOperationsError(documentsResult, 'driver documents');
  throwIfOperationsError(payoutAccountResult, 'driver payout account');
  throwIfOperationsError(platformAccountResult, 'driver payable account');

  const presence = (presenceResult.data ?? null) as AnyRow | null;
  const currentShiftId =
    typeof presence?.current_shift_id === 'string' && presence.current_shift_id.length > 0
      ? presence.current_shift_id
      : null;

  const shiftResult = currentShiftId
    ? await client
        .from('driver_shifts')
        .select('id, started_at, ended_at, total_deliveries, total_earnings, total_distance_km')
        .eq('id', currentShiftId)
        .eq('driver_id', driverId)
        .maybeSingle()
    : { data: null, error: null };

  throwIfOperationsError(shiftResult, 'driver shift');

  return {
    driver: driverResult.data as AnyRow,
    presence,
    activeDeliveries: (activeDeliveriesResult.data ?? []) as unknown as AnyRow[],
    openExceptions: (exceptionsResult.data ?? []) as unknown as AnyRow[],
    documents: (documentsResult.data ?? []) as unknown as AnyRow[],
    payoutAccount: (payoutAccountResult.data ?? null) as AnyRow | null,
    platformAccount: (platformAccountResult.data ?? null) as AnyRow | null,
    shift: (shiftResult.data ?? null) as AnyRow | null,
  };
}
