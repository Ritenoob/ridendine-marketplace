import { describe, expect, it } from 'vitest';
import {
  hoursBetween,
  timeEntryCost,
  computeLaborTotals,
  laborPercentOfSales,
  salesPerLaborHour,
  laborPerOrder,
} from './labor.engine';

const NOW = new Date('2026-06-30T18:00:00Z');

describe('labor.engine', () => {
  it('computes hours worked, costing open entries up to now', () => {
    expect(hoursBetween('2026-06-30T14:00:00Z', '2026-06-30T18:00:00Z', NOW)).toBe(4);
    expect(hoursBetween('2026-06-30T16:00:00Z', null, NOW)).toBe(2); // still clocked in
    expect(hoursBetween('bogus', null, NOW)).toBe(0);
    // clock_out before clock_in never goes negative
    expect(hoursBetween('2026-06-30T18:00:00Z', '2026-06-30T14:00:00Z', NOW)).toBe(0);
  });

  it('costs a time entry by hours × rate', () => {
    expect(timeEntryCost({ clock_in: '2026-06-30T14:00:00Z', clock_out: '2026-06-30T18:00:00Z', hourly_rate: 20 }, NOW)).toBe(80);
    expect(timeEntryCost({ clock_in: '2026-06-30T16:00:00Z', clock_out: null, hourly_rate: 25 }, NOW)).toBe(50);
  });

  it('aggregates labour totals and active/staff counts', () => {
    const totals = computeLaborTotals(
      [
        { clock_in: '2026-06-30T14:00:00Z', clock_out: '2026-06-30T18:00:00Z', hourly_rate: 20, staff_id: 'a' },
        { clock_in: '2026-06-30T16:00:00Z', clock_out: null, hourly_rate: 25, staff_id: 'b' },
        { clock_in: '2026-06-30T17:00:00Z', clock_out: null, hourly_rate: 25, staff_id: 'b' },
      ],
      NOW
    );
    expect(totals.totalHours).toBe(4 + 2 + 1);
    expect(totals.totalCost).toBe(80 + 50 + 25);
    expect(totals.activeCount).toBe(2);
    expect(totals.staffCount).toBe(2); // b counted once
  });

  it('derives labour ratios, guarding divide-by-zero', () => {
    expect(laborPercentOfSales(150, 600)).toBe(0.25);
    expect(laborPercentOfSales(150, 0)).toBeNull();
    expect(salesPerLaborHour(600, 8)).toBe(75);
    expect(salesPerLaborHour(600, 0)).toBeNull();
    expect(laborPerOrder(150, 30)).toBe(5);
    expect(laborPerOrder(150, 0)).toBeNull();
  });
});
