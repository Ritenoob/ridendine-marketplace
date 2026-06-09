export const CART_FEE_DISCLOSURE =
  'Delivery, service fees, HST, promos, and payment are confirmed at checkout.';

export interface CartSummaryItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCartCurrency(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}

export function calculateCartLineTotal(item: Pick<CartSummaryItem, 'price' | 'quantity'>): number {
  return roundMoney(item.price * item.quantity);
}

export function calculateCartSubtotal(items: CartSummaryItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + calculateCartLineTotal(item), 0));
}

export function calculateCartItemCount(items: CartSummaryItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function checkoutHrefForStorefront(storefrontId?: string | null): string {
  return storefrontId ? `/checkout?storefrontId=${encodeURIComponent(storefrontId)}` : '/chefs';
}
