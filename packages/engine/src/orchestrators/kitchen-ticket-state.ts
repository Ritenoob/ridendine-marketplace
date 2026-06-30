// ==========================================
// KITCHEN TICKET STATE MACHINE (Stage 5)
//
// INTERNAL kitchen workflow state. This is deliberately SEPARATE from the
// public order/delivery state machines in order-state-machine.ts. Kitchen
// ticket state is owned by the chef's kitchen and must never drive or replace
// the public order status.
//
// The one bridge that exists is ONE-DIRECTIONAL: when the public order status
// advances (through the engine), `kitchenStatusForOrderStatus` derives the
// matching kitchen status. The reverse never happens — moving a ticket to
// `packing` (a kitchen-only state with no public equivalent) does not, and
// must not, change the public order status.
// ==========================================

export type KitchenTicketStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'packing'
  | 'ready'
  | 'problem'
  | 'completed'
  | 'cancelled';

export const KITCHEN_TICKET_STATUSES: readonly KitchenTicketStatus[] = [
  'new',
  'accepted',
  'preparing',
  'packing',
  'ready',
  'problem',
  'completed',
  'cancelled',
];

// Allowed forward (and recovery) transitions between kitchen states.
const KITCHEN_TICKET_TRANSITION_MAP: Record<KitchenTicketStatus, Set<KitchenTicketStatus>> = {
  new: new Set(['accepted', 'problem', 'cancelled']),
  accepted: new Set(['preparing', 'problem', 'cancelled']),
  // `preparing -> ready` is allowed so kitchens that don't use a packing step
  // can skip straight to ready.
  preparing: new Set(['packing', 'ready', 'problem', 'cancelled']),
  packing: new Set(['ready', 'problem', 'cancelled']),
  ready: new Set(['completed', 'problem', 'cancelled']),
  // A flagged ticket can recover back into any active working state.
  problem: new Set(['accepted', 'preparing', 'packing', 'ready', 'cancelled']),
  completed: new Set(),
  cancelled: new Set(),
};

export const TERMINAL_KITCHEN_TICKET_STATUSES = new Set<KitchenTicketStatus>([
  'completed',
  'cancelled',
]);

// Flat export (mirrors ALLOWED_ORDER_TRANSITIONS in order-state-machine.ts).
export const ALLOWED_KITCHEN_TICKET_TRANSITIONS: Array<{
  from: KitchenTicketStatus;
  to: KitchenTicketStatus;
}> = [];
for (const [from, toSet] of Object.entries(KITCHEN_TICKET_TRANSITION_MAP)) {
  for (const to of toSet) {
    ALLOWED_KITCHEN_TICKET_TRANSITIONS.push({ from: from as KitchenTicketStatus, to });
  }
}

export function isKitchenTicketStatus(value: string): value is KitchenTicketStatus {
  return (KITCHEN_TICKET_STATUSES as readonly string[]).includes(value);
}

export function isValidKitchenTicketTransition(from: string, to: string): boolean {
  if (!isKitchenTicketStatus(from) || !isKitchenTicketStatus(to)) return false;
  return KITCHEN_TICKET_TRANSITION_MAP[from].has(to);
}

export function isTerminalKitchenTicketStatus(status: string): boolean {
  return isKitchenTicketStatus(status) && TERMINAL_KITCHEN_TICKET_STATUSES.has(status);
}

export function assertValidKitchenTicketTransition(from: string, to: string): void {
  if (!isValidKitchenTicketTransition(from, to)) {
    throw new Error(`Invalid kitchen ticket transition: ${from} -> ${to}`);
  }
}

// ------------------------------------------------------------------
// One-directional bridge: public order status -> kitchen ticket status.
//
// Used by the engine to keep a ticket in sync when the PUBLIC order status
// changes. `packing` has no entry here on purpose: it is a kitchen-only state
// the chef sets manually and which maps to no public order status.
// ------------------------------------------------------------------
const ORDER_STATUS_TO_KITCHEN_STATUS: Record<string, KitchenTicketStatus> = {
  pending: 'new',
  accepted: 'accepted',
  preparing: 'preparing',
  ready_for_pickup: 'ready',
  out_for_delivery: 'completed',
  delivered: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'cancelled',
  expired: 'cancelled',
  refunded: 'cancelled',
};

/**
 * Derive the kitchen ticket status implied by a public order status, or null
 * if the order status has no kitchen meaning. Never the reverse — kitchen
 * state must not drive public order status.
 */
export function kitchenStatusForOrderStatus(orderStatus: string): KitchenTicketStatus | null {
  return ORDER_STATUS_TO_KITCHEN_STATUS[orderStatus] ?? null;
}

/**
 * Public statuses past which a manual kitchen-only `packing` state should be
 * preserved rather than overwritten. When an order is still `preparing`, a
 * chef may have advanced the ticket to `packing`; syncing the order's
 * `preparing` status back onto the ticket must not knock it out of `packing`.
 */
export function shouldPreserveKitchenStatus(
  currentKitchenStatus: string,
  derivedFromOrder: KitchenTicketStatus | null
): boolean {
  if (!isKitchenTicketStatus(currentKitchenStatus)) return false;
  if (derivedFromOrder === null) return true;
  // Preserve a more-advanced kitchen-only state (packing) while the public
  // order is still in preparing.
  if (currentKitchenStatus === 'packing' && derivedFromOrder === 'preparing') return true;
  return false;
}
