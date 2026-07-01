// ==========================================
// PRODUCTION ENGINE (Stage 9)
//
// Pure production-planning math: how many batches to run for a demand, batch
// yield variance, net produced after waste, and prep-task progress rollups.
// No DB access — exhaustively unit-testable.
// ==========================================

/** Batches needed to cover demand at a given batch yield (rounds up). */
export function suggestedBatchCount(demandQty: number, batchYield: number): number {
  if (batchYield <= 0) return 0;
  const demand = Math.max(0, demandQty);
  return Math.ceil(demand / batchYield);
}

export interface BatchYieldVariance {
  variance: number;
  /** Fraction over/under plan, or null when there is no planned yield. */
  pct: number | null;
}

export function batchYieldVariance(plannedYield: number, actualYield: number): BatchYieldVariance {
  const variance = actualYield - plannedYield;
  return {
    variance,
    pct: plannedYield > 0 ? variance / plannedYield : null,
  };
}

/** Usable output after subtracting waste (never negative). */
export function netProducedQuantity(actualYield: number, wasteQuantity: number): number {
  return Math.max(0, actualYield - Math.max(0, wasteQuantity));
}

export interface PrepTaskLike {
  status: string;
}

export interface PrepProgress {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  /** Completion fraction 0..1 (0 when there are no tasks). */
  pct: number;
}

export function prepTaskProgress(tasks: PrepTaskLike[]): PrepProgress {
  const total = tasks.length;
  let done = 0;
  let inProgress = 0;
  for (const t of tasks) {
    if (t.status === 'done') done += 1;
    else if (t.status === 'in_progress') inProgress += 1;
  }
  const pending = total - done - inProgress;
  return {
    total,
    done,
    inProgress,
    pending,
    pct: total > 0 ? done / total : 0,
  };
}
