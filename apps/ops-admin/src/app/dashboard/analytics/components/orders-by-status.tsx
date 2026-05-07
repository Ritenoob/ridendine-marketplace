import { Card } from '@ridendine/ui';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  accepted: 'bg-blue-500',
  preparing: 'bg-indigo-500',
  ready_for_pickup: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

interface OrdersByStatusProps {
  ordersByStatus: Record<string, number>;
  totalOrders: number;
}

export function OrdersByStatus({ ordersByStatus, totalOrders }: OrdersByStatusProps) {
  const sorted = Object.entries(ordersByStatus)
    .sort(([, a], [, b]) => b - a);

  return (
    <Card className="border-gray-800 bg-opsPanel p-6">
      <h3 className="text-base font-semibold text-white mb-4">Orders by Status</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">No orders in this period.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(([status, count]) => {
            const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="text-white font-medium">
                    {count} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-700">
                  <div
                    className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
