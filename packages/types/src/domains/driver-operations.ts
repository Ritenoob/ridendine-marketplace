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
