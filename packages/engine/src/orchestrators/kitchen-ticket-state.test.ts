import { describe, expect, it } from 'vitest';
import {
  KITCHEN_TICKET_STATUSES,
  ALLOWED_KITCHEN_TICKET_TRANSITIONS,
  isKitchenTicketStatus,
  isValidKitchenTicketTransition,
  isTerminalKitchenTicketStatus,
  assertValidKitchenTicketTransition,
  kitchenStatusForOrderStatus,
  shouldPreserveKitchenStatus,
} from './kitchen-ticket-state';

describe('kitchen ticket state machine', () => {
  it('recognizes valid kitchen statuses', () => {
    expect(isKitchenTicketStatus('packing')).toBe(true);
    expect(isKitchenTicketStatus('ready_for_pickup')).toBe(false); // that's a PUBLIC order status
    expect(KITCHEN_TICKET_STATUSES).toContain('packing');
  });

  it('allows the happy-path progression including packing', () => {
    expect(isValidKitchenTicketTransition('new', 'accepted')).toBe(true);
    expect(isValidKitchenTicketTransition('accepted', 'preparing')).toBe(true);
    expect(isValidKitchenTicketTransition('preparing', 'packing')).toBe(true);
    expect(isValidKitchenTicketTransition('packing', 'ready')).toBe(true);
    expect(isValidKitchenTicketTransition('ready', 'completed')).toBe(true);
  });

  it('allows skipping packing (preparing -> ready)', () => {
    expect(isValidKitchenTicketTransition('preparing', 'ready')).toBe(true);
  });

  it('rejects illegal and backward transitions', () => {
    expect(isValidKitchenTicketTransition('new', 'ready')).toBe(false);
    expect(isValidKitchenTicketTransition('ready', 'preparing')).toBe(false);
    expect(isValidKitchenTicketTransition('completed', 'preparing')).toBe(false);
    expect(isValidKitchenTicketTransition('cancelled', 'new')).toBe(false);
    expect(isValidKitchenTicketTransition('bogus', 'ready')).toBe(false);
  });

  it('lets a problem ticket recover into any working state', () => {
    for (const to of ['accepted', 'preparing', 'packing', 'ready', 'cancelled']) {
      expect(isValidKitchenTicketTransition('problem', to)).toBe(true);
    }
    expect(isValidKitchenTicketTransition('problem', 'completed')).toBe(false);
  });

  it('marks completed and cancelled as terminal', () => {
    expect(isTerminalKitchenTicketStatus('completed')).toBe(true);
    expect(isTerminalKitchenTicketStatus('cancelled')).toBe(true);
    expect(isTerminalKitchenTicketStatus('packing')).toBe(false);
  });

  it('throws on invalid transition via assert', () => {
    expect(() => assertValidKitchenTicketTransition('new', 'ready')).toThrow(/new -> ready/);
    expect(() => assertValidKitchenTicketTransition('new', 'accepted')).not.toThrow();
  });

  it('exposes a non-empty flat transition list', () => {
    expect(ALLOWED_KITCHEN_TICKET_TRANSITIONS.length).toBeGreaterThan(0);
    expect(ALLOWED_KITCHEN_TICKET_TRANSITIONS).toContainEqual({ from: 'preparing', to: 'packing' });
  });

  describe('one-directional order->kitchen bridge', () => {
    it('maps public order statuses to kitchen statuses', () => {
      expect(kitchenStatusForOrderStatus('pending')).toBe('new');
      expect(kitchenStatusForOrderStatus('accepted')).toBe('accepted');
      expect(kitchenStatusForOrderStatus('preparing')).toBe('preparing');
      expect(kitchenStatusForOrderStatus('ready_for_pickup')).toBe('ready');
      expect(kitchenStatusForOrderStatus('delivered')).toBe('completed');
      expect(kitchenStatusForOrderStatus('rejected')).toBe('cancelled');
    });

    it('has no mapping for unknown statuses', () => {
      expect(kitchenStatusForOrderStatus('totally_unknown')).toBeNull();
    });

    it('never produces packing from any order status (packing is kitchen-only)', () => {
      const derived = new Set(
        ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'delivered', 'completed', 'cancelled', 'rejected']
          .map(kitchenStatusForOrderStatus)
      );
      expect(derived.has('packing')).toBe(false);
    });

    it('preserves a manual packing state while the order is still preparing', () => {
      expect(shouldPreserveKitchenStatus('packing', kitchenStatusForOrderStatus('preparing'))).toBe(true);
      // But a real advance (order ready) should NOT be preserved away.
      expect(shouldPreserveKitchenStatus('packing', kitchenStatusForOrderStatus('ready_for_pickup'))).toBe(false);
      // Non-packing states are not preserved against a known order status.
      expect(shouldPreserveKitchenStatus('preparing', kitchenStatusForOrderStatus('ready_for_pickup'))).toBe(false);
    });
  });
});
