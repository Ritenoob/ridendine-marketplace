// ==========================================
// OPS-ADMIN: Analytics helpers
// ==========================================

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year';

export interface PeriodRange {
  start: Date;
  end: Date;
}

const PERIOD_DAYS: Record<string, number> = {
  today: 0,
  week: 7,
  month: 30,
  year: 365,
};

export function getPeriodDates(period: string): PeriodRange {
  const days = PERIOD_DAYS[period] ?? PERIOD_DAYS['week']!;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export function getPreviousPeriodDates(period: string): PeriodRange {
  const current = getPeriodDates(period);
  const durationMs = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - durationMs),
    end: new Date(current.start.getTime()),
  };
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  const fixed = value.toFixed(1);
  return value > 0 ? `+${fixed}%` : `${fixed}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function buildOrdersByStatus(
  orders: Array<{ status: string }>
): Record<string, number> {
  return orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
}

export function resolvePeriod(raw: string | null): AnalyticsPeriod {
  const valid: AnalyticsPeriod[] = ['today', 'week', 'month', 'year'];
  return valid.includes(raw as AnalyticsPeriod) ? (raw as AnalyticsPeriod) : 'week';
}
