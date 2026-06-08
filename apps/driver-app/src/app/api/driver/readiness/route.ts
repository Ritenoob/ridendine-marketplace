import { createAdminClient } from '@ridendine/db';
import {
  summarizeDriverComplianceDocuments,
  type DriverComplianceDocumentInput,
  type DriverOperationsSummary,
  type DriverPresenceStatus,
  type DriverStatus,
} from '@ridendine/types';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';
import { getDriverReadinessSignal } from '@/lib/driver-readiness';

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

type DriverReadinessRow = {
  id: string;
  status: string | null;
  instant_payouts_enabled: boolean | null;
};

type DriverPresenceRow = {
  status: string | null;
  last_location_at: string | null;
  last_location_update: string | null;
};

type DriverPayoutAccountRow = {
  status: string | null;
  payouts_enabled: boolean | null;
  onboarding_completed_at: string | null;
};

type PlatformAccountRow = {
  balance_cents: number | null;
};

type DriverDocumentRow = DriverComplianceDocumentInput & {
  status: string | null;
  document_type: string | null;
  expires_at: string | null;
};

type QueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

function queryError(...results: Array<QueryResult<unknown>>): string | null {
  const failed = results.find((result) => result.error && result.error.code !== 'PGRST116');
  return failed?.error?.message ?? null;
}

function isPayoutAccountReady(account: DriverPayoutAccountRow | null): boolean {
  if (!account) return false;

  const status = account.status?.toLowerCase() ?? '';
  return (
    status === 'active' ||
    status === 'enabled' ||
    account.payouts_enabled === true ||
    Boolean(account.onboarding_completed_at)
  );
}

function countRows(rows: unknown): number {
  return Array.isArray(rows) ? rows.length : 0;
}

export async function GET() {
  try {
    const driverContext = await getDriverActorContext({ requireApproved: false });
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    const driverResult = (await adminClient
      .from('drivers')
      .select('id,status,instant_payouts_enabled')
      .eq('id', driverContext.driverId)
      .single()) as QueryResult<DriverReadinessRow>;

    if (driverResult.error || !driverResult.data) {
      return errorResponse('NOT_FOUND', 'Driver profile not found', 404);
    }

    const [
      presenceResult,
      activeDeliveriesResult,
      payoutAccountResult,
      complianceDocumentsResult,
      platformAccountResult,
    ] = (await Promise.all([
      adminClient
        .from('driver_presence')
        .select('status,last_location_at,last_location_update')
        .eq('driver_id', driverContext.driverId)
        .maybeSingle(),
      adminClient
        .from('deliveries')
        .select('id,status')
        .eq('driver_id', driverContext.driverId)
        .in('status', ACTIVE_DELIVERY_STATUSES),
      adminClient
        .from('driver_payout_accounts')
        .select('id,status,payouts_enabled,onboarding_completed_at')
        .eq('driver_id', driverContext.driverId)
        .maybeSingle(),
      adminClient
        .from('driver_documents')
        .select('id,status,document_type,expires_at')
        .eq('driver_id', driverContext.driverId),
      adminClient
        .from('platform_accounts')
        .select('balance_cents')
        .eq('owner_id', driverContext.driverId)
        .eq('account_type', 'driver_payable')
        .maybeSingle(),
    ])) as [
      QueryResult<DriverPresenceRow>,
      QueryResult<Array<{ id: string }>>,
      QueryResult<DriverPayoutAccountRow>,
      QueryResult<DriverDocumentRow[]>,
      QueryResult<PlatformAccountRow>,
    ];

    const fetchError = queryError(
      presenceResult,
      activeDeliveriesResult,
      payoutAccountResult,
      complianceDocumentsResult,
      platformAccountResult
    );
    if (fetchError) {
      return errorResponse('FETCH_ERROR', fetchError, 500);
    }

    const driver = driverResult.data;
    const presence = presenceResult.data;
    const approvalStatus = (driver.status ?? 'pending') as DriverStatus;
    const presenceStatus = (presence?.status ?? 'offline') as DriverPresenceStatus;
    const lastLocationAt = presence?.last_location_at ?? presence?.last_location_update ?? null;
    const activeDeliveryCount = countRows(activeDeliveriesResult.data);
    const compliance = summarizeDriverComplianceDocuments(complianceDocumentsResult.data, new Date());
    const complianceOpenItems = compliance.openItems;
    const instantPayoutsEnabled = Boolean(driver.instant_payouts_enabled);
    const availableBalanceCents = Number(platformAccountResult.data?.balance_cents ?? 0);

    const readiness = getDriverReadinessSignal({
      approvalStatus,
      presenceStatus,
      lastLocationAt,
      activeDeliveryCount,
      payoutConnected: isPayoutAccountReady(payoutAccountResult.data),
      complianceOpenItems,
    });

    const summary: DriverOperationsSummary = {
      driverId: driverContext.driverId,
      approvalStatus,
      presenceStatus,
      readiness,
      lastLocationAt,
      activeDeliveryCount,
      availableBalanceCents,
      instantPayoutsEnabled,
      complianceOpenItems,
    };

    return successResponse(summary);
  } catch (error) {
    console.error('Error fetching driver readiness:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
