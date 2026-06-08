import type { DriverReadinessSignal, DriverReadinessStatus } from '@ridendine/types';

export const DRIVER_DISPATCH_LOCATION_TTL_MS = 90_000;
export const OPS_ACTIVE_DELIVERY_STATUSES = [
  'assigned',
  'accepted',
  'en_route_to_pickup',
  'arrived_at_pickup',
  'picked_up',
  'en_route_to_dropoff',
  'arrived_at_dropoff',
] as const;

const SIGNAL_COPY: Record<
  DriverReadinessStatus,
  Omit<DriverReadinessSignal, 'status' | 'detail'>
> = {
  ready: {
    label: 'Ready',
    blocksDispatch: false,
    priority: 'success',
  },
  needs_location: {
    label: 'Location needed',
    blocksDispatch: true,
    priority: 'danger',
  },
  not_dispatchable: {
    label: 'Not dispatchable',
    blocksDispatch: true,
    priority: 'danger',
  },
  not_approved: {
    label: 'Approval needed',
    blocksDispatch: true,
    priority: 'danger',
  },
  suspended: {
    label: 'Suspended',
    blocksDispatch: true,
    priority: 'danger',
  },
  active_delivery_risk: {
    label: 'Active delivery risk',
    blocksDispatch: true,
    priority: 'danger',
  },
  payout_setup_needed: {
    label: 'Payout setup needed',
    blocksDispatch: false,
    priority: 'warning',
  },
};

function normalizeStatus(status: unknown): string {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function buildSignal(status: DriverReadinessStatus, detail: string): DriverReadinessSignal {
  return {
    status,
    ...SIGNAL_COPY[status],
    detail,
  };
}

function getLocationAgeMs(lastLocationAt: string | null, now: Date): number | null {
  if (!lastLocationAt) return null;
  const timestamp = Date.parse(lastLocationAt);
  if (!Number.isFinite(timestamp)) return null;
  return now.getTime() - timestamp;
}

export function buildOpsDriverReadinessSignal(input: {
  approvalStatus: string;
  presenceStatus: string;
  lastLocationAt: string | null;
  activeDeliveryCount: number;
  payoutConnected: boolean;
  complianceOpenItems: number;
  now?: Date;
}): DriverReadinessSignal {
  const now = input.now ?? new Date();
  const approvalStatus = normalizeStatus(input.approvalStatus);
  const presenceStatus = normalizeStatus(input.presenceStatus);

  if (approvalStatus === 'suspended') {
    return buildSignal('suspended', 'Driver account is suspended and cannot receive offers.');
  }

  if (approvalStatus !== 'approved') {
    return buildSignal('not_approved', 'Driver approval has not cleared operations review.');
  }

  if (input.activeDeliveryCount > 0 && presenceStatus === 'offline') {
    return buildSignal(
      'active_delivery_risk',
      'Driver has an active delivery but is currently offline.'
    );
  }

  if (input.complianceOpenItems > 0) {
    return buildSignal(
      'not_dispatchable',
      'Driver has open compliance items that must be resolved before dispatch.'
    );
  }

  if (presenceStatus !== 'online') {
    return buildSignal('not_dispatchable', 'Driver must be online to receive dispatch offers.');
  }

  const locationAgeMs = getLocationAgeMs(input.lastLocationAt, now);
  if (locationAgeMs === null) {
    return buildSignal('needs_location', 'Online drivers need a GPS fix before dispatch.');
  }

  if (locationAgeMs < 0 || locationAgeMs > DRIVER_DISPATCH_LOCATION_TTL_MS) {
    return buildSignal('not_dispatchable', 'Driver GPS is stale and must refresh before dispatch.');
  }

  if (!input.payoutConnected) {
    return buildSignal(
      'payout_setup_needed',
      'Payout setup has not started; driver can still receive dispatch offers.'
    );
  }

  return buildSignal('ready', 'Driver is approved, online, and location is fresh for dispatch.');
}
