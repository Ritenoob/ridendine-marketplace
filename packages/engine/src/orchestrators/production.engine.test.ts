import { describe, expect, it } from 'vitest';
import {
  suggestedBatchCount,
  batchYieldVariance,
  netProducedQuantity,
  prepTaskProgress,
} from './production.engine';

describe('production.engine', () => {
  it('suggests batch count rounding up to cover demand', () => {
    expect(suggestedBatchCount(25, 10)).toBe(3);
    expect(suggestedBatchCount(20, 10)).toBe(2);
    expect(suggestedBatchCount(0, 10)).toBe(0);
    expect(suggestedBatchCount(-5, 10)).toBe(0);
    expect(suggestedBatchCount(5, 0)).toBe(0);
  });

  it('computes batch yield variance', () => {
    expect(batchYieldVariance(10, 12)).toEqual({ variance: 2, pct: 0.2 });
    expect(batchYieldVariance(10, 8)).toEqual({ variance: -2, pct: -0.2 });
    expect(batchYieldVariance(0, 5)).toEqual({ variance: 5, pct: null });
  });

  it('nets produced quantity after waste', () => {
    expect(netProducedQuantity(20, 3)).toBe(17);
    expect(netProducedQuantity(5, 10)).toBe(0);
    expect(netProducedQuantity(5, -2)).toBe(5);
  });

  it('rolls up prep task progress', () => {
    const p = prepTaskProgress([
      { status: 'done' },
      { status: 'done' },
      { status: 'in_progress' },
      { status: 'pending' },
    ]);
    expect(p).toEqual({ total: 4, done: 2, inProgress: 1, pending: 1, pct: 0.5 });
  });

  it('handles an empty prep list', () => {
    expect(prepTaskProgress([])).toEqual({ total: 0, done: 0, inProgress: 0, pending: 0, pct: 0 });
  });
});
