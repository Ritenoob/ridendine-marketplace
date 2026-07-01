'use client';

import { useEffect, useMemo, useState } from 'react';

export interface PrepCountdownProps {
  /** ISO string - preferred if non-null (seed data / future engine writes). */
  estimatedReadyAt?: string | null;
  /** ISO string set when chef taps Start Preparing. */
  prepStartedAt?: string | null;
  /** Minutes set when chef accepts the order. */
  estimatedPrepMinutes?: number | null;
  /** Current order status. */
  status: string;
  /** Render larger text for KDS ticket cards. */
  large?: boolean;
}

/** Remaining milliseconds threshold below which the timer turns amber. */
const AMBER_THRESHOLD_MS = 5 * 60 * 1000;

/** Format elapsed/remaining milliseconds as M:SS. */
function formatMs(ms: number): string {
  const totalSec = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Resolve the countdown target timestamp (ms since epoch) from order fields.
 * Returns null when no live target can be computed.
 * Decision #6: prefer estimatedReadyAt when non-null; else derive from
 * prepStartedAt + estimatedPrepMinutes for a preparing order.
 */
function resolveTarget(
  estimatedReadyAt: string | null | undefined,
  prepStartedAt: string | null | undefined,
  estimatedPrepMinutes: number | null | undefined,
  status: string
): number | null {
  if (estimatedReadyAt) {
    return new Date(estimatedReadyAt).getTime();
  }
  if (
    status === 'preparing' &&
    prepStartedAt &&
    estimatedPrepMinutes != null
  ) {
    return new Date(prepStartedAt).getTime() + estimatedPrepMinutes * 60_000;
  }
  return null;
}

/**
 * Live per-order cook/prep countdown for the kitchen queue.
 * - Green  : > 5 min remaining
 * - Amber  : 0 < t <= 5 min remaining
 * - Red    : overdue (t <= 0)
 *
 * When no live target can be resolved but estimatedPrepMinutes is present,
 * renders a static "Prep ~Nm" label (accepted, not yet started).
 * Otherwise renders "No prep estimate".
 *
 * Accessible via role="timer" + aria-live="off" + aria-label.
 */
export function PrepCountdown({
  estimatedReadyAt,
  prepStartedAt,
  estimatedPrepMinutes,
  status,
  large = false,
}: PrepCountdownProps): React.ReactElement {
  const sizeClass = large ? 'text-base font-bold' : 'text-sm font-medium';
  const [now, setNow] = useState<number>(() => Date.now());

  // Memoized so it doesn't recompute on every 1-second interval tick.
  const target = useMemo(
    () => resolveTarget(estimatedReadyAt, prepStartedAt, estimatedPrepMinutes, status),
    [estimatedReadyAt, prepStartedAt, estimatedPrepMinutes, status]
  );

  // Read once per mount - matchMedia is stable for the session lifetime.
  // Declared before any early return so hook call order is consistent.
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    if (target === null) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [target]);

  // No live target - show static fallback
  if (target === null) {
    if (estimatedPrepMinutes != null) {
      return (
        <span className={`${sizeClass} text-textMuted`}>
          Prep ~{estimatedPrepMinutes}m
        </span>
      );
    }
    return (
      <span className={`${sizeClass} text-textSubtle`}>No prep estimate</span>
    );
  }

  const diffMs = target - now;

  let colorClass: string;
  let label: string;

  if (diffMs <= 0) {
    const overMin = Math.ceil(Math.abs(diffMs) / 60_000);
    colorClass = 'text-danger';
    label = `${overMin}m over`;
  } else if (diffMs <= AMBER_THRESHOLD_MS) {
    colorClass = 'text-warning';
    label = `Ready in ${formatMs(diffMs)}`;
  } else {
    colorClass = 'text-primary';
    label = `Ready in ${formatMs(diffMs)}`;
  }

  const pulseClass = diffMs <= 0 && !reducedMotion ? ' animate-pulse' : '';

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={label}
      className={`${sizeClass}${pulseClass} ${colorClass}`}
    >
      {label}
    </span>
  );
}
