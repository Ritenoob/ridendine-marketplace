import { createAdminClient, getDeliveryHistory, type SupabaseClient } from '@ridendine/db';
import type {
  DriverPresenceStatus,
  DriverShiftActiveDeliverySummary,
  DriverShiftOperationsSummary,
} from '@ridendine/types';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const ACTIVE_DELIVERY_STATUSES = [
  'assigned',
  'accepted',
  'en_route_to_pickup',
  'arrived_at_pickup',
  'picked_up',
  'en_route_to_dropoff',
  'arrived_at_dropoff',
  'en_route_to_customer',
  'arrived_at_customer',
] as const;

type QueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

type DriverPresenceRow = {
  status?: string | null;
  current_shift_id?: string | null;
  last_location_at?: string | null;
  last_location_update?: string | null;
};

type DriverShiftRow = {
  id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  total_deliveries?: number | string | null;
  total_earnings?: number | string | null;
  total_distance_km?: number | string | null;
};

type ActiveDeliveryRow = {
  id?: string | null;
  status?: string | null;
  updated_at?: string | null;
  estimated_dropoff_at?: string | null;
};

type DeliveryHistoryRow = {
  actual_dropoff_at?: string | null;
  driver_payout?: number | string | null;
};

type ShiftSummaryOverrides = {
  presence?: DriverPresenceRow | null;
  shift?: DriverShiftRow | null;
  currentShiftId?: string | null;
};

function queryError(...results: Array<QueryResult<unknown>>): string | null {
  const failed = results.find((result) => result.error && result.error.code !== 'PGRST116');
  return failed?.error?.message ?? null;
}

function numberValue(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function summarizeTodayDeliveries(deliveries: readonly DeliveryHistoryRow[], now = new Date()) {
  const start = todayStart(now);
  const todayDeliveries = deliveries.filter((delivery) => (
    delivery.actual_dropoff_at && new Date(delivery.actual_dropoff_at) >= start
  ));

  return {
    completedDeliveries: todayDeliveries.length,
    earnings: todayDeliveries.reduce(
      (sum, delivery) => sum + numberValue(delivery.driver_payout),
      0
    ),
  };
}

function mapActiveDelivery(row: ActiveDeliveryRow): DriverShiftActiveDeliverySummary {
  return {
    id: row.id ?? '',
    status: row.status ?? 'unknown',
    updatedAt: row.updated_at ?? null,
    estimatedDropoffAt: row.estimated_dropoff_at ?? null,
  };
}

async function buildDriverShiftSummary(
  adminClient: any,
  driverId: string,
  overrides: ShiftSummaryOverrides = {}
): Promise<{ summary: DriverShiftOperationsSummary | null; error: string | null }> {
  const hasPresenceOverride = Object.prototype.hasOwnProperty.call(overrides, 'presence');
  const hasShiftOverride = Object.prototype.hasOwnProperty.call(overrides, 'shift');

  const [presenceResult, activeDeliveriesResult, deliveryHistory] = await Promise.all([
    hasPresenceOverride
      ? Promise.resolve({ data: overrides.presence ?? null, error: null } satisfies QueryResult<DriverPresenceRow>)
      : adminClient
          .from('driver_presence')
          .select('status,current_shift_id,last_location_at,last_location_update')
          .eq('driver_id', driverId)
          .maybeSingle(),
    adminClient
      .from('deliveries')
      .select('id,status,updated_at,estimated_dropoff_at')
      .eq('driver_id', driverId)
      .in('status', ACTIVE_DELIVERY_STATUSES)
      .order('updated_at', { ascending: false }),
    getDeliveryHistory(adminClient as unknown as SupabaseClient, driverId, { limit: 1000 }),
  ]) as [
    QueryResult<DriverPresenceRow>,
    QueryResult<ActiveDeliveryRow[]>,
    DeliveryHistoryRow[],
  ];

  const presence = presenceResult.data;
  const summaryShiftId =
    Object.prototype.hasOwnProperty.call(overrides, 'currentShiftId')
      ? overrides.currentShiftId ?? null
      : presence?.current_shift_id ?? null;
  const lookupShiftId = presence?.current_shift_id ?? summaryShiftId;
  const shiftResult = hasShiftOverride
    ? ({ data: overrides.shift ?? null, error: null } satisfies QueryResult<DriverShiftRow>)
    : lookupShiftId
      ? (await adminClient
          .from('driver_shifts')
          .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
          .eq('id', lookupShiftId)
          .eq('driver_id', driverId)
          .maybeSingle()) as QueryResult<DriverShiftRow>
      : ({ data: null, error: null } satisfies QueryResult<DriverShiftRow>);

  const fetchError = queryError(presenceResult, activeDeliveriesResult, shiftResult);
  if (fetchError) {
    return { summary: null, error: fetchError };
  }

  const shift = shiftResult.data;
  const activeDeliveries = Array.isArray(activeDeliveriesResult.data)
    ? activeDeliveriesResult.data.map(mapActiveDelivery)
    : [];

  return {
    error: null,
    summary: {
      driverId,
      presenceStatus: (presence?.status ?? 'offline') as DriverPresenceStatus,
      currentShiftId: summaryShiftId,
      isOnShift: Boolean(summaryShiftId && !shift?.ended_at),
      shiftStartedAt: shift?.started_at ?? null,
      shiftEndedAt: shift?.ended_at ?? null,
      lastLocationAt: presence?.last_location_at ?? presence?.last_location_update ?? null,
      activeDeliveryCount: activeDeliveries.length,
      activeDeliveries,
      currentShift: shift
        ? {
            totalDeliveries: numberValue(shift.total_deliveries),
            totalEarnings: numberValue(shift.total_earnings),
            totalDistanceKm: shift.total_distance_km == null ? null : numberValue(shift.total_distance_km),
          }
        : null,
      today: summarizeTodayDeliveries(deliveryHistory),
    },
  };
}

function buildPresencePatch(
  driverId: string,
  status: DriverPresenceStatus,
  currentShiftId: string | null,
  timestamp: string
) {
  return {
    driver_id: driverId,
    status,
    current_shift_id: currentShiftId,
    updated_at: timestamp,
  };
}

async function upsertPresence(
  adminClient: any,
  payload: ReturnType<typeof buildPresencePatch>
): Promise<QueryResult<DriverPresenceRow>> {
  return adminClient
    .from('driver_presence')
    .upsert(payload, { onConflict: 'driver_id' })
    .select('status,current_shift_id,last_location_at,last_location_update')
    .single();
}

export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();
    const { summary, error } = await buildDriverShiftSummary(adminClient, driverContext.driverId);
    if (error || !summary) {
      return errorResponse(
        'SHIFT_QUERY_ERROR',
        'Could not load driver shift summary. Please try again.',
        500
      );
    }

    return successResponse(summary);
  } catch (error) {
    console.error('Error fetching driver shift summary:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function POST() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();
    const presenceResult = (await adminClient
      .from('driver_presence')
      .select('status,current_shift_id,last_location_at,last_location_update')
      .eq('driver_id', driverContext.driverId)
      .maybeSingle()) as QueryResult<DriverPresenceRow>;

    if (presenceResult.error && presenceResult.error.code !== 'PGRST116') {
      return errorResponse(
        'SHIFT_START_ERROR',
        'Could not load current driver presence before starting shift.',
        500
      );
    }

    const existingShiftId = presenceResult.data?.current_shift_id ?? null;
    if (existingShiftId) {
      const existingShiftResult = (await adminClient
        .from('driver_shifts')
        .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
        .eq('id', existingShiftId)
        .eq('driver_id', driverContext.driverId)
        .maybeSingle()) as QueryResult<DriverShiftRow>;

      if (existingShiftResult.error && existingShiftResult.error.code !== 'PGRST116') {
        return errorResponse(
          'SHIFT_START_ERROR',
          'Could not load current driver shift before starting shift.',
          500
        );
      }

      if (existingShiftResult.data && !existingShiftResult.data.ended_at) {
        const { summary, error } = await buildDriverShiftSummary(adminClient, driverContext.driverId, {
          presence: presenceResult.data,
          shift: existingShiftResult.data,
        });

        if (error || !summary) {
          return errorResponse(
            'SHIFT_START_ERROR',
            'Could not load driver shift summary after starting shift.',
            500
          );
        }

        return successResponse(summary);
      }
    }

    const timestamp = new Date().toISOString();
    const shiftResult = (await adminClient
      .from('driver_shifts')
      .insert({
        driver_id: driverContext.driverId,
        started_at: timestamp,
        updated_at: timestamp,
      })
      .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
      .single()) as QueryResult<DriverShiftRow>;

    if (shiftResult.error || !shiftResult.data?.id) {
      return errorResponse(
        'SHIFT_START_ERROR',
        'Could not start driver shift. Please try again.',
        500
      );
    }

    const presencePatch = buildPresencePatch(
      driverContext.driverId,
      'online',
      shiftResult.data.id,
      timestamp
    );
    const upsertResult = await upsertPresence(adminClient, presencePatch);
    if (upsertResult.error) {
      return errorResponse(
        'SHIFT_START_ERROR',
        'Could not link driver shift to presence. Please try again.',
        500
      );
    }

    const { summary, error } = await buildDriverShiftSummary(adminClient, driverContext.driverId, {
      presence: upsertResult.data ?? {
        status: 'online',
        current_shift_id: shiftResult.data.id,
        last_location_at: presenceResult.data?.last_location_at ?? null,
        last_location_update: presenceResult.data?.last_location_update ?? null,
      },
      shift: shiftResult.data,
    });

    if (error || !summary) {
      return errorResponse(
        'SHIFT_START_ERROR',
        'Could not load driver shift summary after starting shift.',
        500
      );
    }

    return successResponse(summary);
  } catch (error) {
    console.error('Error starting driver shift:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function DELETE() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();
    const activeDeliveriesResult = (await adminClient
      .from('deliveries')
      .select('id,status,updated_at,estimated_dropoff_at')
      .eq('driver_id', driverContext.driverId)
      .in('status', ACTIVE_DELIVERY_STATUSES)
      .order('updated_at', { ascending: false })) as QueryResult<ActiveDeliveryRow[]>;

    if (activeDeliveriesResult.error) {
      return errorResponse(
        'SHIFT_END_ERROR',
        'Could not check active deliveries before ending shift.',
        500
      );
    }

    if ((activeDeliveriesResult.data ?? []).length > 0) {
      return errorResponse(
        'ACTIVE_DELIVERY_BLOCK',
        'Cannot end shift while active delivery work is still assigned.',
        409
      );
    }

    const presenceResult = (await adminClient
      .from('driver_presence')
      .select('status,current_shift_id,last_location_at,last_location_update')
      .eq('driver_id', driverContext.driverId)
      .maybeSingle()) as QueryResult<DriverPresenceRow>;

    if (presenceResult.error && presenceResult.error.code !== 'PGRST116') {
      return errorResponse(
        'SHIFT_END_ERROR',
        'Could not load current driver presence before ending shift.',
        500
      );
    }

    const currentShiftId = presenceResult.data?.current_shift_id ?? null;
    const currentShiftResult = currentShiftId
      ? (await adminClient
          .from('driver_shifts')
          .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
          .eq('id', currentShiftId)
          .eq('driver_id', driverContext.driverId)
          .maybeSingle()) as QueryResult<DriverShiftRow>
      : ({ data: null, error: null } satisfies QueryResult<DriverShiftRow>);

    if (currentShiftResult.error && currentShiftResult.error.code !== 'PGRST116') {
      return errorResponse(
        'SHIFT_END_ERROR',
        'Could not load current driver shift before ending shift.',
        500
      );
    }

    const timestamp = new Date().toISOString();
    const shift = currentShiftResult.data;
    const endedShiftResult = currentShiftId && shift && !shift.ended_at
      ? (await adminClient
          .from('driver_shifts')
          .update({
            ended_at: timestamp,
            updated_at: timestamp,
          })
          .eq('id', currentShiftId)
          .eq('driver_id', driverContext.driverId)
          .is('ended_at', null)
          .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
          .single()) as QueryResult<DriverShiftRow>
      : ({ data: shift, error: null } satisfies QueryResult<DriverShiftRow>);

    if (endedShiftResult.error) {
      return errorResponse(
        'SHIFT_END_ERROR',
        'Could not end driver shift. Please try again.',
        500
      );
    }

    const presencePatch = buildPresencePatch(driverContext.driverId, 'offline', null, timestamp);
    const upsertResult = await upsertPresence(adminClient, presencePatch);
    if (upsertResult.error) {
      return errorResponse(
        'SHIFT_END_ERROR',
        'Could not clear driver shift from presence. Please try again.',
        500
      );
    }

    const { summary, error } = await buildDriverShiftSummary(adminClient, driverContext.driverId, {
      presence: upsertResult.data ?? {
        status: 'offline',
        current_shift_id: null,
        last_location_at: presenceResult.data?.last_location_at ?? null,
        last_location_update: presenceResult.data?.last_location_update ?? null,
      },
      shift: endedShiftResult.data ?? shift,
      currentShiftId: null,
    });

    if (error || !summary) {
      return errorResponse(
        'SHIFT_END_ERROR',
        'Could not load driver shift summary after ending shift.',
        500
      );
    }

    return successResponse(summary);
  } catch (error) {
    console.error('Error ending driver shift:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
