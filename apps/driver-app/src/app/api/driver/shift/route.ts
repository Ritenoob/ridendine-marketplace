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

export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();
    const [presenceResult, activeDeliveriesResult, deliveryHistory] = await Promise.all([
      adminClient
        .from('driver_presence')
        .select('status,current_shift_id,last_location_at,last_location_update')
        .eq('driver_id', driverContext.driverId)
        .maybeSingle(),
      adminClient
        .from('deliveries')
        .select('id,status,updated_at,estimated_dropoff_at')
        .eq('driver_id', driverContext.driverId)
        .in('status', ACTIVE_DELIVERY_STATUSES)
        .order('updated_at', { ascending: false }),
      getDeliveryHistory(adminClient as unknown as SupabaseClient, driverContext.driverId, { limit: 1000 }),
    ]) as [
      QueryResult<DriverPresenceRow>,
      QueryResult<ActiveDeliveryRow[]>,
      DeliveryHistoryRow[],
    ];

    const presence = presenceResult.data;
    const currentShiftId = presence?.current_shift_id ?? null;
    const shiftResult = currentShiftId
      ? (await adminClient
          .from('driver_shifts')
          .select('id,started_at,ended_at,total_deliveries,total_earnings,total_distance_km')
          .eq('id', currentShiftId)
          .eq('driver_id', driverContext.driverId)
          .maybeSingle()) as QueryResult<DriverShiftRow>
      : ({ data: null, error: null } satisfies QueryResult<DriverShiftRow>);

    const fetchError = queryError(presenceResult, activeDeliveriesResult, shiftResult);
    if (fetchError) {
      return errorResponse(
        'SHIFT_QUERY_ERROR',
        'Could not load driver shift summary. Please try again.',
        500
      );
    }

    const shift = shiftResult.data;
    const activeDeliveries = Array.isArray(activeDeliveriesResult.data)
      ? activeDeliveriesResult.data.map(mapActiveDelivery)
      : [];

    const summary: DriverShiftOperationsSummary = {
      driverId: driverContext.driverId,
      presenceStatus: (presence?.status ?? 'offline') as DriverPresenceStatus,
      currentShiftId,
      isOnShift: Boolean(currentShiftId && !shift?.ended_at),
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
    };

    return successResponse(summary);
  } catch (error) {
    console.error('Error fetching driver shift summary:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
