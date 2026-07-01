// ==========================================
// LABOUR ENGINE (Stage 10)
//
// Pure labour-cost math over time entries. An open entry (no clock_out) is
// costed up to `now`. No DB access — exhaustively unit-testable. (US spelling
// "labor" in code; UI labels read "Labour".)
// ==========================================

export interface TimeEntryLike {
  clock_in: string;
  clock_out: string | null;
  hourly_rate: number;
  staff_id?: string;
}

/** Hours worked between clock-in and clock-out (or `now` if still open). */
export function hoursBetween(clockIn: string, clockOut: string | null, now: Date): number {
  const start = Date.parse(clockIn);
  if (!Number.isFinite(start)) return 0;
  const end = clockOut ? Date.parse(clockOut) : now.getTime();
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

/** Cost of a single time entry = hours × snapshotted hourly rate. */
export function timeEntryCost(entry: TimeEntryLike, now: Date): number {
  return hoursBetween(entry.clock_in, entry.clock_out, now) * Number(entry.hourly_rate ?? 0);
}

export interface LaborTotals {
  totalHours: number;
  totalCost: number;
  /** Entries still open (clocked in, not clocked out). */
  activeCount: number;
  /** Distinct staff represented in the entries. */
  staffCount: number;
}

export function computeLaborTotals(entries: TimeEntryLike[], now: Date): LaborTotals {
  let totalHours = 0;
  let totalCost = 0;
  let activeCount = 0;
  const staff = new Set<string>();
  for (const e of entries) {
    totalHours += hoursBetween(e.clock_in, e.clock_out, now);
    totalCost += timeEntryCost(e, now);
    if (!e.clock_out) activeCount += 1;
    if (e.staff_id) staff.add(e.staff_id);
  }
  return { totalHours, totalCost, activeCount, staffCount: staff.size };
}

/** Labour as a fraction of sales, or null when there are no sales. */
export function laborPercentOfSales(laborCost: number, sales: number): number | null {
  return sales > 0 ? laborCost / sales : null;
}

/** Sales generated per labour hour, or null when no hours worked. */
export function salesPerLaborHour(sales: number, laborHours: number): number | null {
  return laborHours > 0 ? sales / laborHours : null;
}

/** Labour cost per order, or null when there are no orders. */
export function laborPerOrder(laborCost: number, orderCount: number): number | null {
  return orderCount > 0 ? laborCost / orderCount : null;
}
