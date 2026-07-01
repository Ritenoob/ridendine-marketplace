// ==========================================
// PRODUCTION SCHEMA TESTS (Stage 9)
// ==========================================

import { describe, expect, it } from 'vitest';
import {
  createPrepTaskSchema,
  updatePrepTaskSchema,
  createProductionBatchSchema,
  completeBatchSchema,
} from './production';

describe('createPrepTaskSchema', () => {
  it('requires a title and a valid plan date', () => {
    expect(createPrepTaskSchema.safeParse({ title: 'Chop onions', planDate: '2026-07-01' }).success).toBe(true);
    expect(createPrepTaskSchema.safeParse({ title: 'x', planDate: '07/01/2026' }).success).toBe(false);
    expect(createPrepTaskSchema.safeParse({ planDate: '2026-07-01' }).success).toBe(false);
  });
});

describe('updatePrepTaskSchema', () => {
  it('accepts a status/progress update but rejects an empty patch', () => {
    expect(updatePrepTaskSchema.safeParse({ status: 'done' }).success).toBe(true);
    expect(updatePrepTaskSchema.safeParse({ completedQuantity: 5 }).success).toBe(true);
    expect(updatePrepTaskSchema.safeParse({}).success).toBe(false);
  });
});

describe('createProductionBatchSchema', () => {
  it('requires a name and defaults inputs to empty', () => {
    const r = createProductionBatchSchema.safeParse({ name: 'Broth batch' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.inputs).toEqual([]);
  });
  it('validates inputs', () => {
    expect(
      createProductionBatchSchema.safeParse({ name: 'B', inputs: [{ quantity: 5, unit: 'kg' }] }).success
    ).toBe(true);
    expect(createProductionBatchSchema.safeParse({ name: 'B', inputs: [{ quantity: -1 }] }).success).toBe(false);
  });
});

describe('completeBatchSchema', () => {
  it('requires actual yield and defaults waste/outputs', () => {
    const r = completeBatchSchema.safeParse({ actualYield: 20 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.wasteQuantity).toBe(0);
      expect(r.data.outputs).toEqual([]);
    }
    expect(completeBatchSchema.safeParse({}).success).toBe(false);
  });
});
