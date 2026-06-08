import {
  summarizeDriverComplianceDocuments,
  type DriverComplianceDocumentInput,
  type DriverReadinessSignal,
} from '@ridendine/types';
import { getLocationHealth, type LocationHealth } from '@/lib/location-health';
import {
  buildOpsDriverReadinessSignal,
  OPS_ACTIVE_DELIVERY_STATUSES,
} from '@/lib/driver-readiness';

const OPEN_EXCEPTION_STATUSES = [
  'open',
  'acknowledged',
  'in_progress',
  'pending_customer',
  'pending_chef',
  'pending_driver',
  'escalated',
];

export type OpsDriverOperationsSummary = {
  driver: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    approvalStatus: string;
    vehicleType: string | null;
    createdAt: string;
  };
  readiness: DriverReadinessSignal;
  presence: {
    status: string;
    lastLocationAt: string | null;
    locationHealth: LocationHealth;
  };
  activeDeliveryCount: number;
  activeDeliveries: Array<{
    id: string;
    orderId: string | null;
    orderNumber: string | null;
    status: string;
    updatedAt: string;
    estimatedDropoffAt: string | null;
    pickupAddress: string | null;
    dropoffAddress: string | null;
  }>;
  openExceptionCount: number;
  openExceptions: Array<{
    id: string;
    type: string;
    status: string;
    severity: string | null;
    title: string;
    createdAt: string;
  }>;
  compliance: {
    totalDocuments: number;
    pendingDocuments: number;
    rejectedDocuments: number;
    expiredDocuments: number;
    openItems: number;
  };
  payout: {
    connected: boolean;
    accountStatus: string;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    onboardingCompletedAt: string | null;
    availableBalanceCents: number;
    pendingPayoutCents: number;
    currency: string;
    instantPayoutsEnabled: boolean;
  };
  shift: {
    isOnShift: boolean;
    currentShiftId: string | null;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
    totalDeliveries: number;
    totalEarnings: number;
    totalDistanceKm: number | null;
  };
};

type QueryError = { message?: string; code?: string } | null;
type QueryResult<T> = { data: T | null; error: QueryError };
type ListResult<T> = { data: T[] | null; error: QueryError };

function normalizeStatus(status: unknown): string {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function throwIfError(result: { error: QueryError }, label: string) {
  if (result.error) {
    throw new Error(result.error.message ?? `${label} query failed`);
  }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function summarizeCompliance(rows: Array<Record<string, unknown>>, now: Date) {
  const summary = summarizeDriverComplianceDocuments(rows as DriverComplianceDocumentInput[], now);

  return {
    totalDocuments: rows.length,
    pendingDocuments: summary.pendingReview,
    rejectedDocuments: summary.rejected,
    expiredDocuments: summary.expired,
    openItems: summary.openItems,
  };
}

function normalizeOrderNumber(value: unknown): string | null {
  const order = one(value as Record<string, unknown> | Record<string, unknown>[] | null);
  return typeof order?.order_number === 'string' ? order.order_number : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumberValue(value: unknown): number | null {
  if (value == null) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function durationMinutes(startedAt: string | null, endedAt: string | null, now: Date): number | null {
  if (!startedAt) return null;

  const start = Date.parse(startedAt);
  const end = endedAt ? Date.parse(endedAt) : now.getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return Math.max(0, Math.round((end - start) / 60_000));
}

export async function getOpsDriverOperationsSummary(
  client: any,
  driverId: string,
  now = new Date()
): Promise<OpsDriverOperationsSummary | null> {
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
      .maybeSingle() as Promise<QueryResult<Record<string, unknown>>>,
    client
      .from('driver_presence')
      .select('status, current_shift_id, last_location_at, last_location_update, updated_at, current_lat, current_lng, last_location_lat, last_location_lng')
      .eq('driver_id', driverId)
      .maybeSingle() as Promise<QueryResult<Record<string, unknown>>>,
    client
      .from('deliveries')
      .select('id, order_id, status, updated_at, estimated_dropoff_at, pickup_address, dropoff_address, orders ( order_number )')
      .eq('driver_id', driverId)
      .in('status', OPS_ACTIVE_DELIVERY_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(25) as Promise<ListResult<Record<string, unknown>>>,
    client
      .from('order_exceptions')
      .select('id, exception_type, status, severity, title, created_at')
      .eq('driver_id', driverId)
      .in('status', OPEN_EXCEPTION_STATUSES)
      .order('created_at', { ascending: false })
      .limit(25) as Promise<ListResult<Record<string, unknown>>>,
    client
      .from('driver_documents')
      .select('id, document_type, status, expires_at')
      .eq('driver_id', driverId)
      .limit(100) as Promise<ListResult<Record<string, unknown>>>,
    client
      .from('driver_payout_accounts')
      .select('status, payouts_enabled, charges_enabled, onboarding_completed_at')
      .eq('driver_id', driverId)
      .maybeSingle() as Promise<QueryResult<Record<string, unknown>>>,
    client
      .from('platform_accounts')
      .select('balance_cents, pending_payout_cents, currency, updated_at')
      .eq('account_type', 'driver_payable')
      .eq('owner_id', driverId)
      .maybeSingle() as Promise<QueryResult<Record<string, unknown>>>,
  ]);

  throwIfError(driverResult, 'driver');
  if (!driverResult.data) return null;

  throwIfError(presenceResult, 'driver presence');
  throwIfError(activeDeliveriesResult, 'active deliveries');
  throwIfError(exceptionsResult, 'driver exceptions');
  throwIfError(documentsResult, 'driver documents');
  throwIfError(payoutAccountResult, 'driver payout account');
  throwIfError(platformAccountResult, 'driver payable account');

  const driver = driverResult.data;
  const presence = presenceResult.data;
  const activeDeliveries = activeDeliveriesResult.data ?? [];
  const openExceptions = exceptionsResult.data ?? [];
  const documents = documentsResult.data ?? [];
  const payoutAccount = payoutAccountResult.data;
  const platformAccount = platformAccountResult.data;
  const presenceStatus = normalizeStatus(presence?.status) || 'offline';
  const currentShiftId = stringValue(presence?.current_shift_id);
  const shiftResult = currentShiftId
    ? await client
        .from('driver_shifts')
        .select('id, started_at, ended_at, total_deliveries, total_earnings, total_distance_km')
        .eq('id', currentShiftId)
        .eq('driver_id', driverId)
        .maybeSingle() as QueryResult<Record<string, unknown>>
    : ({ data: null, error: null } satisfies QueryResult<Record<string, unknown>>);

  throwIfError(shiftResult, 'driver shift');

  const shift = shiftResult.data;
  const shiftStartedAt = stringValue(shift?.started_at);
  const shiftEndedAt = stringValue(shift?.ended_at);
  const lastLocationAt =
    (presence?.last_location_update as string | null | undefined) ??
    (presence?.last_location_at as string | null | undefined) ??
    (presence?.updated_at as string | null | undefined) ??
    null;
  const compliance = summarizeCompliance(documents, now);
  const payoutConnected = Boolean(
    payoutAccount &&
      (payoutAccount.status === 'active' ||
        payoutAccount.payouts_enabled === true ||
        payoutAccount.onboarding_completed_at)
  );

  return {
    driver: {
      id: String(driver.id),
      name:
        `${(driver.first_name as string | null) ?? ''} ${(driver.last_name as string | null) ?? ''}`.trim() ||
        String(driver.id),
      email: (driver.email as string | null) ?? null,
      phone: (driver.phone as string | null) ?? null,
      approvalStatus: normalizeStatus(driver.status) || 'unknown',
      vehicleType: (driver.vehicle_type as string | null) ?? null,
      createdAt: (driver.created_at as string | null) ?? new Date(0).toISOString(),
    },
    readiness: buildOpsDriverReadinessSignal({
      approvalStatus: String(driver.status ?? ''),
      presenceStatus,
      lastLocationAt,
      activeDeliveryCount: activeDeliveries.length,
      payoutConnected,
      complianceOpenItems: compliance.openItems,
      now,
    }),
    presence: {
      status: presenceStatus,
      lastLocationAt,
      locationHealth: getLocationHealth(lastLocationAt, presenceStatus),
    },
    activeDeliveryCount: activeDeliveries.length,
    activeDeliveries: activeDeliveries.map((delivery) => ({
      id: String(delivery.id),
      orderId: (delivery.order_id as string | null) ?? null,
      orderNumber: normalizeOrderNumber(delivery.orders),
      status: String(delivery.status ?? 'unknown'),
      updatedAt: (delivery.updated_at as string | null) ?? new Date(0).toISOString(),
      estimatedDropoffAt: (delivery.estimated_dropoff_at as string | null) ?? null,
      pickupAddress: (delivery.pickup_address as string | null) ?? null,
      dropoffAddress: (delivery.dropoff_address as string | null) ?? null,
    })),
    openExceptionCount: openExceptions.length,
    openExceptions: openExceptions.map((exception) => ({
      id: String(exception.id),
      type: String(exception.exception_type ?? 'unknown'),
      status: String(exception.status ?? 'unknown'),
      severity: (exception.severity as string | null) ?? null,
      title: String(exception.title ?? exception.exception_type ?? 'Exception'),
      createdAt: (exception.created_at as string | null) ?? new Date(0).toISOString(),
    })),
    compliance,
    payout: {
      connected: Boolean(payoutAccount),
      accountStatus: (payoutAccount?.status as string | null) ?? 'not_started',
      payoutsEnabled: Boolean(payoutAccount?.payouts_enabled),
      chargesEnabled: Boolean(payoutAccount?.charges_enabled),
      onboardingCompletedAt: (payoutAccount?.onboarding_completed_at as string | null) ?? null,
      availableBalanceCents: Number(platformAccount?.balance_cents ?? 0),
      pendingPayoutCents: Number(platformAccount?.pending_payout_cents ?? 0),
      currency: (platformAccount?.currency as string | null) ?? 'CAD',
      instantPayoutsEnabled: Boolean(driver.instant_payouts_enabled),
    },
    shift: {
      isOnShift: Boolean(currentShiftId && shift && !shiftEndedAt),
      currentShiftId,
      startedAt: shiftStartedAt,
      endedAt: shiftEndedAt,
      durationMinutes: durationMinutes(shiftStartedAt, shiftEndedAt, now),
      totalDeliveries: numberValue(shift?.total_deliveries),
      totalEarnings: numberValue(shift?.total_earnings),
      totalDistanceKm: nullableNumberValue(shift?.total_distance_km),
    },
  };
}
