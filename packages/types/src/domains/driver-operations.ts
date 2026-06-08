// ==========================================
// DRIVER OPERATIONS DOMAIN TYPES
// ==========================================

import type { DriverPresenceStatus, DriverStatus } from '../enums';

export type DriverReadinessStatus =
  | 'ready'
  | 'needs_location'
  | 'not_dispatchable'
  | 'not_approved'
  | 'suspended'
  | 'active_delivery_risk'
  | 'payout_setup_needed';

export interface DriverReadinessSignal {
  readonly status: DriverReadinessStatus;
  readonly label: string;
  readonly detail: string;
  readonly blocksDispatch: boolean;
  readonly priority: 'success' | 'warning' | 'danger' | 'idle';
}

export interface DriverOperationsSummary {
  readonly driverId: string;
  readonly approvalStatus: DriverStatus;
  readonly presenceStatus: DriverPresenceStatus;
  readonly readiness: DriverReadinessSignal;
  readonly lastLocationAt: string | null;
  readonly activeDeliveryCount: number;
  readonly availableBalanceCents: number;
  /**
   * Downstream operations summaries expose this payout capability. Phase 1
   * readiness does not treat instant payout availability as a dispatch blocker.
   */
  readonly instantPayoutsEnabled: boolean;
  readonly complianceOpenItems: number;
}

export interface DriverShiftActiveDeliverySummary {
  readonly id: string;
  readonly status: string;
  readonly updatedAt: string | null;
  readonly estimatedDropoffAt: string | null;
}

export interface DriverCurrentShiftSummary {
  readonly totalDeliveries: number;
  readonly totalEarnings: number;
  readonly totalDistanceKm: number | null;
}

export interface DriverShiftOperationsSummary {
  readonly driverId: string;
  readonly presenceStatus: DriverPresenceStatus;
  readonly currentShiftId: string | null;
  readonly isOnShift: boolean;
  readonly shiftStartedAt: string | null;
  readonly shiftEndedAt: string | null;
  readonly lastLocationAt: string | null;
  readonly activeDeliveryCount: number;
  readonly activeDeliveries: readonly DriverShiftActiveDeliverySummary[];
  readonly currentShift: DriverCurrentShiftSummary | null;
  readonly today: {
    readonly completedDeliveries: number;
    readonly earnings: number;
  };
}
