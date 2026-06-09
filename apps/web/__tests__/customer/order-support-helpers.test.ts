import {
  buildOrderSupportHref,
  canReorderOrder,
  canReviewOrder,
} from '../../src/lib/order-support';

describe('order support helpers', () => {
  it('builds a support handoff URL with order context', () => {
    expect(buildOrderSupportHref('RD-1001')).toBe(
      '/contact?orderNumber=RD-1001&subject=Help%20with%20order%20RD-1001'
    );
  });

  it('allows review only for delivered customer-safe states', () => {
    expect(canReviewOrder('delivered', 'delivered')).toBe(true);
    expect(canReviewOrder('completed', null)).toBe(true);
    expect(canReviewOrder('preparing', 'cooking')).toBe(false);
  });

  it('allows reorder only for completed or delivered orders', () => {
    expect(canReorderOrder('completed', null)).toBe(true);
    expect(canReorderOrder('delivered', 'delivered')).toBe(true);
    expect(canReorderOrder('pending', 'placed')).toBe(false);
  });
});
