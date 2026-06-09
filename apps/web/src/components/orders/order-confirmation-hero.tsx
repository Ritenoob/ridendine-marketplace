import { Card } from '@ridendine/ui';

interface OrderConfirmationHeroProps {
  orderNumber: string;
  total: number;
  storefrontName: string;
  estimatedDeliveryMinutes: number | null;
  driverFirstName?: string | null;
}

function formatTotal(total: number): string {
  return `$${Number(total).toFixed(2)}`;
}

export function OrderConfirmationHero({
  orderNumber,
  total,
  storefrontName,
  estimatedDeliveryMinutes,
  driverFirstName,
}: OrderConfirmationHeroProps) {
  const summaryItems = [
    { label: 'Order', value: `Order ${orderNumber}` },
    { label: 'Total paid', value: formatTotal(total) },
    { label: 'Kitchen', value: storefrontName },
    {
      label: 'Estimated delivery',
      value: estimatedDeliveryMinutes ? `${estimatedDeliveryMinutes} min` : 'Updating soon',
    },
    {
      label: 'Driver',
      value: driverFirstName || 'Assigned after pickup',
    },
  ];

  return (
    <Card padding="lg" elevated>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-successSoft">
          <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-success">Receipt sent</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-text">Order confirmed</h1>
          <p className="mt-2 text-sm leading-relaxed text-textMuted">
            Your order is with {storefrontName}. Keep this page open for live kitchen and delivery updates.
          </p>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-surfaceMuted p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-textSubtle">{item.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-text">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}
