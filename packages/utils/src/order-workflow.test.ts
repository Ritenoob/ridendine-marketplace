import { describe, expect, it } from 'vitest';
import {
  ENGINE_ORDER_ACTIONS,
  KITCHEN_NEXT_TRANSITION,
  KITCHEN_REJECT_TRANSITION,
  KITCHEN_WORKFLOW,
  TERMINAL_ORDER_STATUSES,
  getEngineOrderAction,
  getKitchenWorkflowStep,
  isTerminalOrderStatus,
} from './order-workflow';

describe('KITCHEN_WORKFLOW', () => {
  it('covers exactly the four active kitchen statuses', () => {
    expect(Object.keys(KITCHEN_WORKFLOW).sort()).toEqual([
      'accepted',
      'pending',
      'preparing',
      'ready_for_pickup',
    ]);
  });

  it('keeps the pending decision step copy', () => {
    expect(KITCHEN_WORKFLOW.pending).toEqual({
      step: 'Accept or reject',
      nextAction: 'Accept order',
      focus: 'Decision',
      guidance: 'Review the ticket and accept before the countdown expires.',
    });
  });

  it('keeps the accepted prep step copy', () => {
    expect(KITCHEN_WORKFLOW.accepted).toEqual({
      step: 'Prep setup',
      nextAction: 'Start Preparing',
      focus: 'Prep',
      guidance: 'Confirm items, timing, and any special instructions before cooking.',
    });
  });

  it('keeps the preparing cook step copy', () => {
    expect(KITCHEN_WORKFLOW.preparing).toEqual({
      step: 'Kitchen work',
      nextAction: 'Mark Ready',
      focus: 'Cook',
      guidance:
        'Finish, package, and mark ready only when the order can be handed to a driver.',
    });
  });

  it('keeps the ready_for_pickup handoff step copy', () => {
    expect(KITCHEN_WORKFLOW.ready_for_pickup).toEqual({
      step: 'Pickup handoff',
      nextAction: 'Waiting for driver',
      focus: 'Handoff',
      guidance: 'Keep the order sealed, staged, and visible for driver pickup.',
    });
  });
});

describe('getKitchenWorkflowStep', () => {
  it.each(['pending', 'accepted', 'preparing', 'ready_for_pickup'] as const)(
    'returns the workflow entry for %s',
    (status) => {
      expect(getKitchenWorkflowStep(status, 'unused')).toBe(KITCHEN_WORKFLOW[status]);
    }
  );

  it.each(['delivered', 'cancelled', 'rejected', 'expired', 'unknown_status'])(
    'returns the read-only fallback for %s using the supplied label',
    (status) => {
      expect(getKitchenWorkflowStep(status, 'Display label')).toEqual({
        step: 'Display label',
        nextAction: 'No kitchen action',
        focus: 'Review',
        guidance: 'This order does not need a kitchen state change right now.',
      });
    }
  );
});

describe('KITCHEN_NEXT_TRANSITION', () => {
  it('moves pending orders forward via accept', () => {
    expect(KITCHEN_NEXT_TRANSITION.pending).toEqual({
      action: 'accept',
      nextStatus: 'accepted',
      buttonLabel: 'Accept',
    });
  });

  it('moves accepted orders forward via start_preparing', () => {
    expect(KITCHEN_NEXT_TRANSITION.accepted).toEqual({
      action: 'start_preparing',
      nextStatus: 'preparing',
      buttonLabel: 'Start Preparing',
    });
  });

  it('moves preparing orders forward via mark_ready', () => {
    expect(KITCHEN_NEXT_TRANSITION.preparing).toEqual({
      action: 'mark_ready',
      nextStatus: 'ready_for_pickup',
      buttonLabel: 'Mark Ready',
    });
  });

  it('has no forward transition for ready_for_pickup (driver handoff)', () => {
    expect(Object.keys(KITCHEN_NEXT_TRANSITION).sort()).toEqual([
      'accepted',
      'pending',
      'preparing',
    ]);
  });
});

describe('KITCHEN_REJECT_TRANSITION', () => {
  it('rejects pending orders via reject', () => {
    expect(KITCHEN_REJECT_TRANSITION).toEqual({
      action: 'reject',
      nextStatus: 'rejected',
      buttonLabel: 'Reject',
    });
  });
});

describe('ENGINE_ORDER_ACTIONS', () => {
  it('covers exactly the engine-backed workflow action keys', () => {
    expect(Object.keys(ENGINE_ORDER_ACTIONS).sort()).toEqual([
      'accept_order',
      'complete_order',
      'mark_ready',
      'reject_order',
      'start_preparing',
    ]);
  });

  it.each([
    ['accept_order', 'accept', 'Accept Order', 'Order accepted'],
    ['reject_order', 'reject', 'Reject Order', 'Order rejected'],
    ['start_preparing', 'start_preparing', 'Start Preparing', 'Order moved to preparing'],
    ['mark_ready', 'mark_ready', 'Mark Ready', 'Order marked ready'],
    ['complete_order', 'complete', 'Complete Order', 'Order completed'],
  ] as const)('%s maps to api action %s with label %s', (key, apiAction, label, successMessage) => {
    expect(ENGINE_ORDER_ACTIONS[key]).toEqual({ apiAction, label, successMessage });
    expect(getEngineOrderAction(key)).toEqual({ apiAction, label, successMessage });
  });

  it('returns undefined for non-workflow allowed actions', () => {
    expect(getEngineOrderAction('request_dispatch')).toBeUndefined();
    expect(getEngineOrderAction('ops_override')).toBeUndefined();
    expect(getEngineOrderAction('')).toBeUndefined();
  });
});

describe('terminal statuses', () => {
  it('matches the ops-admin terminal list', () => {
    expect([...TERMINAL_ORDER_STATUSES]).toEqual([
      'completed',
      'cancelled',
      'rejected',
      'refunded',
    ]);
  });

  it.each(['completed', 'cancelled', 'rejected', 'refunded'])(
    'treats %s as terminal',
    (status) => {
      expect(isTerminalOrderStatus(status)).toBe(true);
    }
  );

  it.each(['pending', 'accepted', 'preparing', 'ready_for_pickup', 'delivered', ''])(
    'treats %s as non-terminal',
    (status) => {
      expect(isTerminalOrderStatus(status)).toBe(false);
    }
  );
});
