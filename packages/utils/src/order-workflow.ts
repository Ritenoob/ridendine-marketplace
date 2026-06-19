// ==========================================
// ORDER WORKFLOW (kitchen / ops admin surfaces)
// ==========================================
//
// Shared status -> next-action workflow logic for the chef-admin and
// ops-admin order screens. This was previously triplicated:
//   - apps/chef-admin .../orders-list.tsx (inline KITCHEN_WORKFLOW + handlers)
//   - apps/ops-admin .../orders/page.tsx (inline statusToAction map)
//   - apps/ops-admin .../orders/[id]/status-actions.tsx (inline actionConfig)
//
// Display labels stay in @ridendine/ui (ORDER_STATUS_LABELS); the canonical
// engine state machine stays in @ridendine/types (ORDER_TRANSITIONS). This
// module owns the admin-facing workflow layer: which API action moves an
// order forward from each kitchen status, the button/guidance copy for the
// chef kitchen queue, and terminal-state checks.
//
// The customer-facing workflow (apps/web customer-order-workflow.ts) is
// intentionally separate: its copy and tones are customer-specific.

import type { OrderStatus } from '@ridendine/types';

/** Statuses the chef kitchen actively works (everything else is read-only). */
export type KitchenOrderStatus = Extract<
  OrderStatus,
  'pending' | 'accepted' | 'preparing' | 'ready_for_pickup'
>;

/** Kitchen statuses that still have a forward transition the chef can take. */
export type KitchenActionableStatus = Exclude<KitchenOrderStatus, 'ready_for_pickup'>;

/** `action` values accepted by the order PATCH APIs. */
export type OrderWorkflowApiAction =
  | 'accept'
  | 'reject'
  | 'start_preparing'
  | 'mark_ready'
  | 'complete'
  | 'cancel';

// ------------------------------------------
// Chef kitchen workflow (guidance panel)
// ------------------------------------------

export interface KitchenWorkflowStep {
  /** Short name of the current kitchen step. */
  step: string;
  /** Label of the next action (also shown when no button is rendered). */
  nextAction: string;
  /** One-word focus tag shown next to the step. */
  focus: string;
  /** Guidance copy for the kitchen. */
  guidance: string;
}

export const KITCHEN_WORKFLOW: Record<KitchenOrderStatus, KitchenWorkflowStep> = {
  pending: {
    step: 'Accept or reject',
    nextAction: 'Accept order',
    focus: 'Decision',
    guidance: 'Review the ticket and accept before the countdown expires.',
  },
  accepted: {
    step: 'Prep setup',
    nextAction: 'Start Preparing',
    focus: 'Prep',
    guidance: 'Confirm items, timing, and any special instructions before cooking.',
  },
  preparing: {
    step: 'Kitchen work',
    nextAction: 'Mark Ready',
    focus: 'Cook',
    guidance: 'Finish, package, and mark ready only when the order can be handed to a driver.',
  },
  ready_for_pickup: {
    step: 'Pickup handoff',
    nextAction: 'Waiting for driver',
    focus: 'Handoff',
    guidance: 'Keep the order sealed, staged, and visible for driver pickup.',
  },
};

/**
 * Workflow step for an order status. Statuses outside the kitchen workflow
 * (delivered, cancelled, ...) get a read-only fallback whose `step` is the
 * caller-supplied display label for the status.
 */
export function getKitchenWorkflowStep(
  status: string,
  fallbackStepLabel: string
): KitchenWorkflowStep {
  const step = (KITCHEN_WORKFLOW as Record<string, KitchenWorkflowStep | undefined>)[status];
  return (
    step ?? {
      step: fallbackStepLabel,
      nextAction: 'No kitchen action',
      focus: 'Review',
      guidance: 'This order does not need a kitchen state change right now.',
    }
  );
}

// ------------------------------------------
// Status -> next transition (chef + ops list)
// ------------------------------------------

export interface KitchenTransition {
  /** `action` to send in the PATCH body. */
  action: OrderWorkflowApiAction;
  /** Status the order moves to (used for optimistic UI updates). */
  nextStatus: OrderStatus;
  /** Kitchen button label for this transition. */
  buttonLabel: string;
}

/** Primary forward transition from each actionable kitchen status. */
export const KITCHEN_NEXT_TRANSITION: Record<KitchenActionableStatus, KitchenTransition> = {
  pending: { action: 'accept', nextStatus: 'accepted', buttonLabel: 'Accept' },
  accepted: { action: 'start_preparing', nextStatus: 'preparing', buttonLabel: 'Start Preparing' },
  preparing: { action: 'mark_ready', nextStatus: 'ready_for_pickup', buttonLabel: 'Mark Ready' },
};

/** Chef-side rejection of a pending order (reason/notes stay at the call site). */
export const KITCHEN_REJECT_TRANSITION: KitchenTransition = {
  action: 'reject',
  nextStatus: 'rejected',
  buttonLabel: 'Reject',
};

// ------------------------------------------
// Engine allowed-action presentation (ops detail)
// ------------------------------------------

/**
 * Allowed-action keys returned by `engine.orders.getAllowedActions` that the
 * ops order detail screen can execute. Ops-only actions that are not part of
 * the shared workflow (force-assign, refunds, overrides) stay in ops-admin.
 */
export type EngineOrderActionKey =
  | 'accept_order'
  | 'reject_order'
  | 'start_preparing'
  | 'mark_ready'
  | 'complete_order';

export interface EngineOrderActionPresentation {
  /** `action` to send in the engine PATCH body. */
  apiAction: OrderWorkflowApiAction;
  /** Button label. */
  label: string;
  /** Success message shown after the action completes. */
  successMessage: string;
}

export const ENGINE_ORDER_ACTIONS: Record<EngineOrderActionKey, EngineOrderActionPresentation> = {
  accept_order: { apiAction: 'accept', label: 'Accept Order', successMessage: 'Order accepted' },
  reject_order: { apiAction: 'reject', label: 'Reject Order', successMessage: 'Order rejected' },
  start_preparing: {
    apiAction: 'start_preparing',
    label: 'Start Preparing',
    successMessage: 'Order moved to preparing',
  },
  mark_ready: { apiAction: 'mark_ready', label: 'Mark Ready', successMessage: 'Order marked ready' },
  complete_order: { apiAction: 'complete', label: 'Complete Order', successMessage: 'Order completed' },
};

/** Presentation for an engine allowed-action key, or undefined if not workflow-backed. */
export function getEngineOrderAction(
  actionKey: string
): EngineOrderActionPresentation | undefined {
  return (ENGINE_ORDER_ACTIONS as Record<string, EngineOrderActionPresentation | undefined>)[
    actionKey
  ];
}

// ------------------------------------------
// Status normalization (shared with the customer-facing workflow)
// ------------------------------------------

/** Canonical lowercase/trimmed form used to key status lookup tables. */
export function normalizeOrderStatus(status: string): string {
  return status.trim().toLowerCase();
}

/**
 * Human-readable fallback label for a status with no curated copy
 * (e.g. 'ready_for_pickup' -> 'Ready For Pickup').
 */
export function formatOrderStatusFallbackLabel(
  status: string,
  emptyLabel = 'Order update'
): string {
  const normalized = normalizeOrderStatus(status);
  if (!normalized) return emptyLabel;
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ------------------------------------------
// Terminal states
// ------------------------------------------

/** Statuses with no further admin workflow actions. */
export const TERMINAL_ORDER_STATUSES = [
  'completed',
  'cancelled',
  'rejected',
  'refunded',
] as const satisfies readonly OrderStatus[];

export function isTerminalOrderStatus(status: string): boolean {
  return (TERMINAL_ORDER_STATUSES as readonly string[]).includes(status);
}
