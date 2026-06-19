import {
  createAdminClient,
  listDriverComplianceDocRefs,
  listDriverPayoutAccountRefs,
  listOpsLiveBoardDrivers,
  listOpsLiveBoardOrders,
  listOpsLiveBoardStorefronts,
  type SupabaseClient,
} from '@ridendine/db';
import {
  mapEngineStatusToPublicStage,
  PublicOrderStage,
  summarizeDriverComplianceDocuments,
  type DriverComplianceDocumentInput,
} from '@ridendine/types';
import {
  getEngine,
  getOpsActorContext,
  guardPlatformApi,
  successResponse,
  errorResponse,
} from '@/lib/engine';
import {
  buildOpsDriverReadinessSignal,
  OPS_ACTIVE_DELIVERY_STATUSES,
} from '@/lib/driver-readiness';
import type {
  OpsLiveChefSnapshot,
  OpsLiveDeliverySnapshot,
  OpsLiveDriverSnapshot,
  OpsLiveOrderSnapshot,
  OpsLiveBoardPressure,
} from '@/lib/ops-live-feed-types';

export const dynamic = 'force-dynamic';
const LIVE_ACTIVE_DELIVERY_STATUS_SET: ReadonlySet<string> = new Set(OPS_ACTIVE_DELIVERY_STATUSES);

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function mapOrderRow(
  row: Record<string, unknown>,
  delivery: OpsLiveDeliverySnapshot | null
): OpsLiveOrderSnapshot | null {
  const id = row.id as string;
  const storefront = one(row.storefront as Record<string, unknown> | Record<string, unknown>[] | null);
  const customer = one(row.customer as Record<string, unknown> | Record<string, unknown>[] | null);
  const chefName = (storefront?.name as string | undefined) ?? '—';
  const cfn = (customer?.first_name as string | undefined) ?? '';
  const cln = (customer?.last_name as string | undefined) ?? '';
  const customerName = `${cfn} ${cln}`.trim() || '—';

  return {
    id,
    order_number: row.order_number as string,
    engine_status: (row.engine_status as string | null) ?? null,
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    estimated_ready_at: (row.estimated_ready_at as string | null) ?? null,
    ready_at: (row.ready_at as string | null) ?? null,
    prep_started_at: (row.prep_started_at as string | null) ?? null,
    storefront_id: row.storefront_id as string,
    customer_id: row.customer_id as string,
    chef_name: chefName,
    customer_name: customerName,
    delivery,
  };
}

function mapDeliveryNested(row: Record<string, unknown> | null): OpsLiveDeliverySnapshot | null {
  if (!row || typeof row !== 'object') return null;
  const id = row.id as string;
  if (!id) return null;
  return {
    id,
    order_id: row.order_id as string,
    status: row.status as string,
    driver_id: (row.driver_id as string | null) ?? null,
    updated_at: row.updated_at as string,
    estimated_dropoff_at: (row.estimated_dropoff_at as string | null) ?? null,
    escalated_to_ops: (row.escalated_to_ops as boolean | null) ?? null,
    assignment_attempts_count: (row.assignment_attempts_count as number | null) ?? null,
    pickup_lat: (row.pickup_lat as number | null) ?? null,
    pickup_lng: (row.pickup_lng as number | null) ?? null,
    dropoff_lat: (row.dropoff_lat as number | null) ?? null,
    dropoff_lng: (row.dropoff_lng as number | null) ?? null,
    pickup_address: (row.pickup_address as string) ?? '',
    dropoff_address: (row.dropoff_address as string) ?? '',
    route_polyline: (row.route_polyline as string | null | undefined) ?? undefined,
  };
}

function countComplianceOpenItems(rows: Record<string, unknown>[], now: Date): number {
  return summarizeDriverComplianceDocuments(rows as DriverComplianceDocumentInput[], now).openItems;
}

function isPayoutConnected(row: Record<string, unknown> | undefined): boolean {
  return Boolean(
    row &&
      (row.status === 'active' ||
        row.payouts_enabled === true ||
        row.onboarding_completed_at)
  );
}

/**
 * GET /api/ops/live-board
 * Initial snapshot for the live operations board (admin only).
 */
export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'dashboard_read');
  if (denied) return denied;

  const admin = createAdminClient() as unknown as SupabaseClient;
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  try {
    // Orders are the critical query (failure -> QUERY_FAILED); the drivers
    // and chefs columns previously tolerated per-query errors by rendering
    // empty, so their repository failures degrade to [] the same way.
    const [ordersRes, driversData, chefsData, dash] = await Promise.all([
      listOpsLiveBoardOrders(admin, since, 400).then(
        (rows) => ({ rows, errorMessage: null as string | null }),
        (error: unknown) => ({
          rows: [] as Record<string, unknown>[],
          errorMessage:
            error instanceof Error ? error.message : 'Failed to load live board orders',
        })
      ),
      listOpsLiveBoardDrivers(admin).catch(() => [] as Record<string, unknown>[]),
      listOpsLiveBoardStorefronts(admin).catch(() => [] as Record<string, unknown>[]),
      getEngine().ops.getDashboard(),
    ]);

    if (ordersRes.errorMessage !== null) {
      return errorResponse('QUERY_FAILED', ordersRes.errorMessage, 500);
    }

    const todayStart = startOfTodayIso();
    const ordersRaw = (ordersRes.rows ?? []) as Record<string, unknown>[];
    const orders: OpsLiveOrderSnapshot[] = [];

    for (const row of ordersRaw) {
      const del = mapDeliveryNested(one(row.deliveries as Record<string, unknown> | Record<string, unknown>[] | null));
      const mapped = mapOrderRow(row, del);
      if (!mapped) continue;
      const stage = mapEngineStatusToPublicStage(mapped.engine_status);
      if (stage === PublicOrderStage.DELIVERED) {
        const doneAt = (row.completed_at as string | undefined) || mapped.updated_at;
        if (doneAt < todayStart) continue;
      }
      orders.push(mapped);
    }

    const activeDeliveriesByDriver = new Map<string, number>();
    for (const order of orders) {
      const delivery = order.delivery;
      if (!delivery?.driver_id || !LIVE_ACTIVE_DELIVERY_STATUS_SET.has(delivery.status)) continue;
      activeDeliveriesByDriver.set(
        delivery.driver_id,
        (activeDeliveriesByDriver.get(delivery.driver_id) ?? 0) + 1
      );
    }

    const driverIds = (driversData as Record<string, unknown>[])
      .map((driver) => driver.id)
      .filter((id): id is string => typeof id === 'string');
    // Compliance/payout decorations previously tolerated query errors by
    // skipping; repository failures degrade to [] the same way.
    const [documentRows, payoutAccountRows] = driverIds.length > 0
      ? await Promise.all([
          listDriverComplianceDocRefs(admin, driverIds, 1000).catch(() => []),
          listDriverPayoutAccountRefs(admin, driverIds, 1000).catch(() => []),
        ])
      : [[], []];
    const documentsByDriver = new Map<string, Record<string, unknown>[]>();
    for (const doc of documentRows as unknown as Record<string, unknown>[]) {
      const driverId = doc.driver_id;
      if (typeof driverId !== 'string') continue;
      const rows = documentsByDriver.get(driverId) ?? [];
      rows.push(doc);
      documentsByDriver.set(driverId, rows);
    }
    const payoutByDriver = new Map<string, Record<string, unknown>>();
    for (const account of payoutAccountRows as unknown as Record<string, unknown>[]) {
      const driverId = account.driver_id;
      if (typeof driverId === 'string') payoutByDriver.set(driverId, account);
    }
    const now = new Date();
    const drivers: OpsLiveDriverSnapshot[] = (driversData as Record<string, unknown>[]).map((d) => {
      const p = one(d.driver_presence as Record<string, unknown> | Record<string, unknown>[] | null);
      const driverId = d.id as string;
      const presenceStatus = (p?.status as string | null | undefined) ?? 'offline';
      const lastLocationAt =
        (p?.last_location_update as string | null | undefined) ??
        (p?.last_location_at as string | null | undefined) ??
        (p?.updated_at as string | null | undefined) ??
        null;
      const complianceOpenItems = countComplianceOpenItems(documentsByDriver.get(driverId) ?? [], now);
      const payoutConnected = isPayoutConnected(payoutByDriver.get(driverId));
      return {
        id: driverId,
        first_name: d.first_name as string,
        last_name: d.last_name as string,
        driver_status: d.status as string,
        updated_at: d.updated_at as string,
        payoutConnected,
        complianceOpenItems,
        readiness: buildOpsDriverReadinessSignal({
          approvalStatus: (d.status as string | null) ?? '',
          presenceStatus,
          lastLocationAt,
          activeDeliveryCount: activeDeliveriesByDriver.get(driverId) ?? 0,
          payoutConnected,
          complianceOpenItems,
        }),
        presence: p
          ? {
              status: presenceStatus,
              updated_at: (p.updated_at as string) ?? (d.updated_at as string),
              current_lat: (p.current_lat as number | null) ?? null,
              current_lng: (p.current_lng as number | null) ?? null,
              last_location_lat: (p.last_location_lat as number | null) ?? null,
              last_location_lng: (p.last_location_lng as number | null) ?? null,
              last_location_at: (p.last_location_at as string | null) ?? null,
              last_location_update: (p.last_location_update as string | null) ?? null,
            }
          : null,
      };
    });

    const chefs: OpsLiveChefSnapshot[] = (chefsData as Record<string, unknown>[]).map((c) => {
      const prof = one(c.chef_profiles as Record<string, unknown> | Record<string, unknown>[] | null);
      const dn = (prof?.display_name as string | undefined) ?? '';
      return {
        id: c.id as string,
        name: c.name as string,
        chef_display_name: dn || (c.name as string),
        storefront_state: (c.storefront_state as string | null) ?? null,
        is_paused: (c.is_paused as boolean | null) ?? null,
        current_queue_size: (c.current_queue_size as number | null) ?? null,
        max_queue_size: (c.max_queue_size as number | null) ?? null,
        is_overloaded: (c.is_overloaded as boolean | null) ?? null,
        estimated_prep_time_max: (c.estimated_prep_time_max as number) ?? 60,
        updated_at: c.updated_at as string,
      };
    });

    const pressure: OpsLiveBoardPressure = {
      openExceptions: dash.openExceptions,
      slaBreaches: dash.slaBreaches,
      pendingDispatch: dash.pendingDispatch,
      deliveryEscalations: dash.deliveryEscalations,
    };

    return successResponse({ orders, drivers, chefs, pressure });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse('LIVE_BOARD_FAILED', msg, 500);
  }
}
