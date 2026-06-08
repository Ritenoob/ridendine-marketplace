'use client';

import { Card, Badge } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';

interface HistoryViewProps {
  deliveries: Delivery[];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

function groupDeliveries(deliveries: Delivery[]) {
  const grouped: Record<string, Delivery[]> = {};

  deliveries.forEach((delivery) => {
    if (!delivery.actual_dropoff_at) return;

    const date = formatDate(delivery.actual_dropoff_at);
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(delivery);
  });

  return grouped;
}

export default function HistoryView({ deliveries }: HistoryViewProps) {
  const groupedDeliveries = groupDeliveries(deliveries);
  const dateGroups = Object.keys(groupedDeliveries);

  const totalEarnings = deliveries.reduce((sum, d) => sum + d.driver_payout, 0);
  const totalDeliveries = deliveries.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <p className="text-[13px] text-[#6b7280]">Total Deliveries</p>
          <p className="mt-1 text-[28px] font-bold text-[#1a1a1a]">{totalDeliveries}</p>
        </Card>
        <Card className="border-0 shadow-sm">
          <p className="text-[13px] text-[#6b7280]">Total Earned</p>
          <p className="mt-1 text-[28px] font-bold text-[#22c55e]">${totalEarnings.toFixed(2)}</p>
        </Card>
      </div>

      {/* Delivery History */}
      <div>
        {dateGroups.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <div className="py-12 text-center">
              <p className="text-[15px] text-[#6b7280]">No completed deliveries yet</p>
              <p className="mt-2 text-[13px] text-[#9ca3af]">
                Your delivery history will appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((date) => (
              <Card key={date} className="border-0 shadow-sm">
                <h2 className="text-[15px] font-semibold text-[#1a1a1a]">{date}</h2>
                <div className="mt-4 space-y-3">
                  {groupedDeliveries[date]?.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-start justify-between border-b border-[#f5f5f5] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-medium text-[#1a1a1a]">
                            {delivery.dropoff_address.split(',')[0]}
                          </p>
                          <Badge
                            variant={getStatusColor(delivery.status)}
                            className="text-[11px]"
                          >
                            {delivery.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[13px] text-[#6b7280]">
                          {delivery.actual_dropoff_at
                            ? formatTime(delivery.actual_dropoff_at)
                            : '—'}
                        </p>
                        <p className="mt-1 text-[13px] text-[#9ca3af]">
                          {delivery.distance_km?.toFixed(1) ?? '—'} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[17px] font-semibold text-[#22c55e]">
                          ${delivery.driver_payout.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
