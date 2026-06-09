const DELIVERED_STATUSES = new Set(['delivered', 'completed']);

export function buildOrderSupportHref(orderNumber: string): string {
  const encodedOrderNumber = encodeURIComponent(orderNumber);
  const encodedSubject = encodeURIComponent(`Help with order ${orderNumber}`);
  return `/contact?orderNumber=${encodedOrderNumber}&subject=${encodedSubject}`;
}

export function canReviewOrder(status: string | null | undefined, publicStage: string | null | undefined): boolean {
  return publicStage === 'delivered' || DELIVERED_STATUSES.has(status ?? '');
}

export function canReorderOrder(status: string | null | undefined, publicStage: string | null | undefined): boolean {
  return publicStage === 'delivered' || DELIVERED_STATUSES.has(status ?? '');
}
