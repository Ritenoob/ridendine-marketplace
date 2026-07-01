// ==========================================
// LABOUR SCHEMA TESTS (Stage 10)
// ==========================================

import { describe, expect, it } from 'vitest';
import { createStaffSchema, createShiftSchema, clockInSchema, clockOutSchema } from './labor';

const UUID = '77777777-7777-4777-8777-777777777777';

describe('createStaffSchema', () => {
  it('accepts a staff member with a default rate', () => {
    const r = createStaffSchema.safeParse({ name: 'Alex' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hourlyRate).toBe(0);
  });
  it('rejects a negative rate', () => {
    expect(createStaffSchema.safeParse({ name: 'Alex', hourlyRate: -5 }).success).toBe(false);
  });
});

describe('createShiftSchema', () => {
  it('requires end after start', () => {
    expect(
      createShiftSchema.safeParse({
        staffId: UUID,
        scheduledStart: '2026-07-01T09:00:00Z',
        scheduledEnd: '2026-07-01T17:00:00Z',
      }).success
    ).toBe(true);
    expect(
      createShiftSchema.safeParse({
        staffId: UUID,
        scheduledStart: '2026-07-01T17:00:00Z',
        scheduledEnd: '2026-07-01T09:00:00Z',
      }).success
    ).toBe(false);
  });
});

describe('clock schemas', () => {
  it('clock-in requires a staff id', () => {
    expect(clockInSchema.safeParse({ staffId: UUID }).success).toBe(true);
    expect(clockInSchema.safeParse({}).success).toBe(false);
  });
  it('clock-out needs an entry id or staff id', () => {
    expect(clockOutSchema.safeParse({ timeEntryId: UUID }).success).toBe(true);
    expect(clockOutSchema.safeParse({ staffId: UUID }).success).toBe(true);
    expect(clockOutSchema.safeParse({}).success).toBe(false);
  });
});
