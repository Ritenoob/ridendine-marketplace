import { orderConfirmationPath } from '@/lib/customer-ordering';

export type CustomerOrderStatusTone = 'success' | 'warning' | 'info' | 'default' | 'error';

export interface CustomerOrderWorkflowInput {
  id: string;
  orderNumber: string;
  status: string;
  itemCount?: number;
}

export interface CustomerOrderWorkflow {
  statusLabel: string;
  statusTone: CustomerOrderStatusTone;
  nextStepLabel: string;
  primaryActionLabel: string;
  detailHref: string;
  supportHref: string;
  canReorder: boolean;
}

interface StatusPresentation {
  statusLabel: string;
  statusTone: CustomerOrderStatusTone;
  nextStepLabel: string;
  primaryActionLabel: string;
}

const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  pending: {
    statusLabel: 'Order received',
    statusTone: 'warning',
    nextStepLabel: 'We are confirming your order with the chef.',
    primaryActionLabel: 'Track order',
  },
  submitted: {
    statusLabel: 'Order received',
    statusTone: 'warning',
    nextStepLabel: 'We are confirming your order with the chef.',
    primaryActionLabel: 'Track order',
  },
  payment_authorized: {
    statusLabel: 'Order received',
    statusTone: 'warning',
    nextStepLabel: 'We are confirming your order with the chef.',
    primaryActionLabel: 'Track order',
  },
  accepted: {
    statusLabel: 'Accepted',
    statusTone: 'info',
    nextStepLabel: 'The chef has accepted your order.',
    primaryActionLabel: 'Track order',
  },
  preparing: {
    statusLabel: 'Being prepared',
    statusTone: 'info',
    nextStepLabel: 'The chef is preparing your order.',
    primaryActionLabel: 'Track order',
  },
  ready: {
    statusLabel: 'Ready for pickup',
    statusTone: 'info',
    nextStepLabel: 'A driver will pick up your order soon.',
    primaryActionLabel: 'Track order',
  },
  picked_up: {
    statusLabel: 'Out for delivery',
    statusTone: 'info',
    nextStepLabel: 'Your driver is heading to you.',
    primaryActionLabel: 'Track order',
  },
  out_for_delivery: {
    statusLabel: 'Out for delivery',
    statusTone: 'info',
    nextStepLabel: 'Your driver is heading to you.',
    primaryActionLabel: 'Track order',
  },
  delivered: {
    statusLabel: 'Delivered',
    statusTone: 'success',
    nextStepLabel: 'Ready to review or reorder.',
    primaryActionLabel: 'View receipt',
  },
  completed: {
    statusLabel: 'Delivered',
    statusTone: 'success',
    nextStepLabel: 'Ready to review or reorder.',
    primaryActionLabel: 'View receipt',
  },
  cancelled: {
    statusLabel: 'Cancelled',
    statusTone: 'error',
    nextStepLabel: 'No further action is needed. Contact support if something looks off.',
    primaryActionLabel: 'View details',
  },
  canceled: {
    statusLabel: 'Cancelled',
    statusTone: 'error',
    nextStepLabel: 'No further action is needed. Contact support if something looks off.',
    primaryActionLabel: 'View details',
  },
  failed: {
    statusLabel: 'Issue found',
    statusTone: 'error',
    nextStepLabel: 'Contact support if this order still needs attention.',
    primaryActionLabel: 'View details',
  },
};

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

function fallbackStatusLabel(status: string): string {
  const normalized = normalizeStatus(status);
  if (!normalized) return 'Order update';
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function customerOrderSupportHref(order: Pick<CustomerOrderWorkflowInput, 'id' | 'orderNumber'>): string {
  const params = new URLSearchParams({
    topic: 'order-support',
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
  return `/contact?${params.toString()}`;
}

export function buildCustomerOrderWorkflow(input: CustomerOrderWorkflowInput): CustomerOrderWorkflow {
  const normalizedStatus = normalizeStatus(input.status);
  const presentation = STATUS_PRESENTATION[normalizedStatus] ?? {
    statusLabel: fallbackStatusLabel(input.status),
    statusTone: 'default',
    nextStepLabel: 'Track this order for the latest update.',
    primaryActionLabel: 'View details',
  };
  const itemCount = input.itemCount ?? 0;

  return {
    ...presentation,
    detailHref: orderConfirmationPath(input.id),
    supportHref: customerOrderSupportHref(input),
    canReorder: ['delivered', 'completed'].includes(normalizedStatus) && itemCount > 0,
  };
}
