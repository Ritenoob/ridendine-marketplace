export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ExceptionStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'pending_customer'
  | 'pending_chef'
  | 'pending_driver'
  | 'resolved'
  | 'closed'
  | 'escalated';
export type ExceptionSlaState = 'none' | 'on_track' | 'at_risk' | 'breached';
export type ExceptionTone = 'danger' | 'warning' | 'info' | 'success' | 'idle';
export type ExceptionOwnerState = 'owned' | 'unassigned';

export interface ExceptionQueueRow {
  id: string;
  exception_type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  title: string;
  description: string | null;
  recommended_actions: string[] | null;
  order_id: string | null;
  customer_id: string | null;
  chef_id: string | null;
  driver_id: string | null;
  delivery_id: string | null;
  assigned_to: string | null;
  sla_deadline: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
  orders?: { order_number: string | null; status: string | null } | null;
}

export interface ExceptionSlaView {
  state: ExceptionSlaState;
  label: string;
  minutesRemaining: number | null;
}

export interface ExceptionQueueItem {
  id: string;
  type: string;
  typeLabel: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  title: string;
  description: string | null;
  recommendedActions: string[];
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  customerId: string | null;
  chefId: string | null;
  driverId: string | null;
  deliveryId: string | null;
  assignedTo: string | null;
  ownerState: ExceptionOwnerState;
  ownerLabel: string;
  sla: ExceptionSlaView;
  escalated: boolean;
  waitingOn: 'customer' | 'chef' | 'driver' | null;
  createdAt: string;
  updatedAt: string;
  ageMinutes: number;
  ageLabel: string;
  primaryAction: string;
}

export interface ExceptionQueueSummary {
  totalOpen: number;
  criticalOrHigh: number;
  unassigned: number;
  breachedSla: number;
  atRiskSla: number;
  escalated: number;
  waitingOnParticipant: number;
  activeAlerts: number;
  openSupportTickets: number;
}

export interface ExceptionQueueFilters {
  all: number;
  critical: number;
  unassigned: number;
  breached: number;
  escalated: number;
  waiting: number;
}

export interface ExceptionQueue {
  items: ExceptionQueueItem[];
  reviewQueue: ExceptionQueueItem[];
  summary: ExceptionQueueSummary;
  filters: ExceptionQueueFilters;
}

export interface ExceptionQueueOptions {
  now?: Date;
  activeAlertCount?: number;
  openTicketCount?: number;
}

const CLOSED_STATUSES = new Set<ExceptionStatus>(['resolved', 'closed']);
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function formatExceptionLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatExceptionStatus(status: string): string {
  return formatExceptionLabel(status);
}

export function getExceptionTone(severity: ExceptionSeverity): ExceptionTone {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'info';
}

export function getStatusTone(status: ExceptionStatus): ExceptionTone {
  if (status === 'escalated') return 'danger';
  if (status === 'open') return 'warning';
  if (status.startsWith('pending_')) return 'info';
  if (status === 'resolved' || status === 'closed') return 'success';
  return 'idle';
}

export function getSlaTone(state: ExceptionSlaState): ExceptionTone {
  if (state === 'breached') return 'danger';
  if (state === 'at_risk') return 'warning';
  if (state === 'on_track') return 'success';
  return 'idle';
}

export function getExceptionSlaState(
  deadline: string | null | undefined,
  now: Date = new Date()
): ExceptionSlaView {
  if (!deadline) {
    return { state: 'none', label: 'No SLA', minutesRemaining: null };
  }

  const deadlineTime = new Date(deadline).getTime();
  if (Number.isNaN(deadlineTime)) {
    return { state: 'none', label: 'Invalid SLA', minutesRemaining: null };
  }

  const remainingMs = deadlineTime - now.getTime();
  const minutesRemaining = Math.ceil(remainingMs / MINUTE_MS);

  if (remainingMs < 0) {
    return {
      state: 'breached',
      label: `Breached ${Math.abs(minutesRemaining)}m ago`,
      minutesRemaining,
    };
  }

  if (remainingMs <= FIFTEEN_MINUTES_MS) {
    return { state: 'at_risk', label: `${minutesRemaining}m left`, minutesRemaining };
  }

  return { state: 'on_track', label: `${minutesRemaining}m left`, minutesRemaining };
}

function getAge(createdAt: string, now: Date): { ageMinutes: number; ageLabel: string } {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return { ageMinutes: 0, ageLabel: 'Unknown age' };

  const ageMinutes = Math.max(0, Math.floor((now.getTime() - createdTime) / MINUTE_MS));

  if (ageMinutes < 60) return { ageMinutes, ageLabel: `${ageMinutes}m` };

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return { ageMinutes, ageLabel: `${ageHours}h` };

  return { ageMinutes, ageLabel: `${Math.floor(ageHours / 24)}d` };
}

function getWaitingOn(status: ExceptionStatus): ExceptionQueueItem['waitingOn'] {
  if (status === 'pending_customer') return 'customer';
  if (status === 'pending_chef') return 'chef';
  if (status === 'pending_driver') return 'driver';
  return null;
}

function getPrimaryAction(item: {
  status: ExceptionStatus;
  ownerState: ExceptionOwnerState;
  sla: Pick<ExceptionSlaView, 'state'>;
  escalated: boolean;
  waitingOn: ExceptionQueueItem['waitingOn'];
  recommendedActions: string[];
}): string {
  if (item.sla.state === 'breached') return 'SLA breached. Escalate and resolve the blocker.';
  if (item.escalated) return 'Escalated. Assign an owner and drive resolution.';
  if (item.ownerState === 'unassigned') return 'Assign an Ops owner.';
  if (item.waitingOn === 'customer') return 'Waiting on customer response.';
  if (item.waitingOn === 'chef') return 'Waiting on chef response.';
  if (item.waitingOn === 'driver') return 'Waiting on driver response.';
  return item.recommendedActions[0] ?? 'Review exception details.';
}

function mapQueueItem(row: ExceptionQueueRow, now: Date): ExceptionQueueItem {
  const sla = getExceptionSlaState(row.sla_deadline, now);
  const age = getAge(row.created_at, now);
  const waitingOn = getWaitingOn(row.status);
  const assignedTo = row.assigned_to ?? null;
  const ownerState: ExceptionOwnerState = assignedTo ? 'owned' : 'unassigned';
  const recommendedActions = Array.isArray(row.recommended_actions)
    ? row.recommended_actions.filter(Boolean)
    : [];
  const item = {
    id: row.id,
    type: row.exception_type,
    typeLabel: formatExceptionLabel(row.exception_type),
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    recommendedActions,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? null,
    orderStatus: row.orders?.status ?? null,
    customerId: row.customer_id,
    chefId: row.chef_id,
    driverId: row.driver_id,
    deliveryId: row.delivery_id,
    assignedTo,
    ownerState,
    ownerLabel: ownerState === 'owned' ? 'Owned' : 'Unassigned',
    sla,
    escalated: row.status === 'escalated' || Boolean(row.escalated_at),
    waitingOn,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...age,
  };

  return {
    ...item,
    primaryAction: getPrimaryAction(item),
  };
}

function getPriorityScore(item: ExceptionQueueItem): number {
  const severityScore: Record<ExceptionSeverity, number> = {
    critical: 10000,
    high: 7000,
    medium: 4000,
    low: 1000,
  };

  return (
    severityScore[item.severity] +
    (item.escalated ? 1000 : 0) +
    (item.sla.state === 'breached' ? 800 : 0) +
    (item.sla.state === 'at_risk' ? 500 : 0) +
    (item.ownerState === 'unassigned' ? 200 : 0) +
    (item.waitingOn ? 100 : 0)
  );
}

function isOpen(item: Pick<ExceptionQueueItem, 'status'>): boolean {
  return !CLOSED_STATUSES.has(item.status);
}

export function buildExceptionQueue(
  rows: ExceptionQueueRow[],
  options: ExceptionQueueOptions = {}
): ExceptionQueue {
  const now = options.now ?? new Date();
  const items = rows.map((row) => mapQueueItem(row, now));
  const reviewQueue = items
    .filter(isOpen)
    .sort((a, b) => {
      const scoreDiff = getPriorityScore(b) - getPriorityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const criticalItems = items.filter((item) =>
    isOpen(item) && (item.severity === 'critical' || item.severity === 'high')
  );
  const unassignedItems = items.filter((item) => isOpen(item) && item.ownerState === 'unassigned');
  const breachedItems = items.filter((item) => isOpen(item) && item.sla.state === 'breached');
  const escalatedItems = items.filter((item) => isOpen(item) && item.escalated);
  const waitingItems = items.filter((item) => isOpen(item) && Boolean(item.waitingOn));

  return {
    items,
    reviewQueue,
    summary: {
      totalOpen: items.filter(isOpen).length,
      criticalOrHigh: criticalItems.length,
      unassigned: unassignedItems.length,
      breachedSla: breachedItems.length,
      atRiskSla: items.filter((item) => isOpen(item) && item.sla.state === 'at_risk').length,
      escalated: escalatedItems.length,
      waitingOnParticipant: waitingItems.length,
      activeAlerts: options.activeAlertCount ?? 0,
      openSupportTickets: options.openTicketCount ?? 0,
    },
    filters: {
      all: items.filter(isOpen).length,
      critical: criticalItems.length,
      unassigned: unassignedItems.length,
      breached: breachedItems.length,
      escalated: escalatedItems.length,
      waiting: waitingItems.length,
    },
  };
}
