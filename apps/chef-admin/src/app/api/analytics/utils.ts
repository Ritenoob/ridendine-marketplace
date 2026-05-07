export type Period = 'week' | 'month' | 'year';

export interface PeriodDateRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  days: number;
}

export interface HourlyOrder {
  hour: number;
  count: number;
}

/**
 * Get start/end dates for current and previous periods.
 */
export function getPeriodDateRange(period: Period): PeriodDateRange {
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end, prevStart, prevEnd, days };
}

/**
 * Calculate percentage change between current and previous values.
 * Returns null when previous is 0 and current is non-zero (undefined growth).
 */
export function calculateComparison(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Return the hour (0-23) with the highest order count.
 */
export function findPeakHour(hourlyOrders: HourlyOrder[]): number {
  if (hourlyOrders.length === 0) return 0;
  return hourlyOrders.reduce(
    (peak, h) => (h.count > (hourlyOrders[peak]?.count ?? 0) ? h.hour : peak),
    hourlyOrders[0]?.hour ?? 0
  );
}

/**
 * Calculate repeat customer rate as a percentage.
 * Customers with more than one order are "repeat" customers.
 */
export function calculateRepeatCustomerRate(customerIds: string[]): number {
  if (customerIds.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (const id of customerIds) {
    counts[id] = (counts[id] ?? 0) + 1;
  }
  const unique = Object.keys(counts);
  if (unique.length === 0) return 0;
  const repeats = unique.filter((id) => (counts[id] ?? 0) > 1).length;
  return (repeats / unique.length) * 100;
}

/**
 * Format an hour number as a human-readable time range string.
 * e.g. 18 -> "6-7 PM"
 */
export function formatHourRange(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const next = (hour + 1) % 12 === 0 ? 12 : (hour + 1) % 12;
  const nextPeriod = hour + 1 < 12 ? 'AM' : 'PM';
  if (period === nextPeriod) return `${h}-${next} ${period}`;
  return `${h} ${period} - ${next} ${nextPeriod}`;
}
