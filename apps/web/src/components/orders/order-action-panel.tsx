import Link from 'next/link';
import { Card, buttonVariants } from '@ridendine/ui';
import {
  buildOrderSupportHref,
  canReorderOrder,
  canReviewOrder,
} from '@/lib/order-support';

interface OrderActionPanelProps {
  orderNumber: string;
  storefrontName: string;
  status: string;
  publicStage?: string | null;
}

export function OrderActionPanel({
  orderNumber,
  storefrontName,
  status,
  publicStage,
}: OrderActionPanelProps) {
  const supportHref = buildOrderSupportHref(orderNumber);
  const showReview = canReviewOrder(status, publicStage);
  const showReorder = canReorderOrder(status, publicStage);

  return (
    <Card padding="lg" className="border-border bg-surface">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-textSubtle">
            Order {orderNumber}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text">What happens next</h2>
          <p className="mt-1 text-sm leading-relaxed text-textMuted">
            We will keep this page updated as {storefrontName} prepares your order and the delivery moves forward.
          </p>
          <p className="mt-2 text-sm font-medium text-text">{storefrontName}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={supportHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Contact support
          </Link>
          <Link href="/chefs" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            Keep browsing
          </Link>
          {showReview && (
            <a href="#review" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              Leave a review
            </a>
          )}
          {showReorder && (
            <Link href="/account/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Reorder from history
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
