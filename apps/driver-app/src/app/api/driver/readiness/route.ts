import {
  createAdminClient,
  getDriverReadinessRawData,
  type DriverReadinessPayoutAccountRow,
  type DriverReadinessQueryResult,
} from '@ridendine/db';
import {
  summarizeDriverComplianceDocuments,
  type DriverOperationsSummary,
  type DriverPresenceStatus,
  type DriverStatus,
} from '@ridendine/types';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';
import { getDriverReadinessSignal } from '@/lib/driver-readiness';

export const dynamic = 'force-dynamic';

function queryError(...results: Array<DriverReadinessQueryResult<unknown>>): string | null {
  const failed = results.find((result) => result.error && result.error.code !== 'PGRST116');
  return failed?.error?.message ?? null;
}

function isPayoutAccountReady(account: DriverReadinessPayoutAccountRow | null): boolean {
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
    const {
      driverResult,
      presenceResult,
      activeDeliveriesResult,
      payoutAccountResult,
      complianceDocumentsResult,
      platformAccountResult,
    } = await getDriverReadinessRawData(adminClient, driverContext.driverId);

    if (driverResult.error || !driverResult.data) {
      return errorResponse('NOT_FOUND', 'Driver profile not found', 404);
    }

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
