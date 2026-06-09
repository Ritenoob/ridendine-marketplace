/**
 * @jest-environment node
 */
import {
  CART_FEE_DISCLOSURE,
  calculateCartItemCount,
  calculateCartLineTotal,
  calculateCartSubtotal,
  checkoutHrefForStorefront,
  formatCartCurrency,
} from '@/lib/cart-summary';

const items = [
  { id: 'cart-1', name: 'Butter Chicken', price: 18.99, quantity: 2 },
  { id: 'cart-2', name: 'Mango Lassi', price: 6, quantity: 1 },
];

describe('cart summary helpers', () => {
  it('calculates cart subtotal from decimal prices and quantities', () => {
    expect(calculateCartSubtotal(items)).toBe(43.98);
  });

  it('calculates total item count from quantities', () => {
    expect(calculateCartItemCount(items)).toBe(3);
  });

  it('formats line totals and currency', () => {
    expect(calculateCartLineTotal(items[0])).toBe(37.98);
    expect(formatCartCurrency(37.98)).toBe('$37.98');
    expect(formatCartCurrency(6)).toBe('$6.00');
  });

  it('creates checkout hrefs only when a storefront id is available', () => {
    expect(checkoutHrefForStorefront('sf-1')).toBe('/checkout?storefrontId=sf-1');
    expect(checkoutHrefForStorefront(undefined)).toBe('/chefs');
  });

  it('uses a truthful fee disclosure instead of client-side final totals', () => {
    expect(CART_FEE_DISCLOSURE).toContain('Delivery, service fees, HST, promos, and payment');
    expect(CART_FEE_DISCLOSURE).toContain('confirmed at checkout');
  });
});
