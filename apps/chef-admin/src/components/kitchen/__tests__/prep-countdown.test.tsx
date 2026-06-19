/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { PrepCountdown } from '../prep-countdown';

describe('PrepCountdown', () => {
  const NOW = new Date('2026-06-19T12:00:00.000Z').getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('(a) preparing order with future target shows green "Ready in"', () => {
    // started 5 min ago, 20 min total -> 15 min left
    const prepStartedAt = new Date(NOW - 5 * 60 * 1000).toISOString();

    render(
      <PrepCountdown
        status="preparing"
        prepStartedAt={prepStartedAt}
        estimatedPrepMinutes={20}
      />
    );

    const el = screen.getByRole('timer');
    expect(el).toHaveTextContent(/ready in/i);
    // Verify green class applied (not red/amber)
    expect(el.className).not.toMatch(/text-danger|text-warning/);
  });

  it('(b) preparing order whose window has passed shows red "over"', () => {
    // started 25 min ago, 20 min total -> 5 min overdue
    const prepStartedAt = new Date(NOW - 25 * 60 * 1000).toISOString();

    render(
      <PrepCountdown
        status="preparing"
        prepStartedAt={prepStartedAt}
        estimatedPrepMinutes={20}
      />
    );

    const el = screen.getByRole('timer');
    expect(el).toHaveTextContent(/over/i);
    expect(el.className).toMatch(/text-danger/);
  });

  it('(c) accepted order (not started) shows static "Prep ~Nm"', () => {
    render(
      <PrepCountdown
        status="accepted"
        estimatedPrepMinutes={15}
      />
    );

    expect(screen.getByText(/prep ~15m/i)).toBeInTheDocument();
    // No live timer element since target is indeterminate
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('(d) no estimate shows "No prep estimate"', () => {
    render(
      <PrepCountdown
        status="pending"
      />
    );

    expect(screen.getByText(/no prep estimate/i)).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('prefers estimatedReadyAt when non-null over prep_started_at computation', () => {
    // estimatedReadyAt in 10 min, but prep_started_at computation would say overdue
    const estimatedReadyAt = new Date(NOW + 10 * 60 * 1000).toISOString();
    const prepStartedAt = new Date(NOW - 25 * 60 * 1000).toISOString();

    render(
      <PrepCountdown
        status="preparing"
        estimatedReadyAt={estimatedReadyAt}
        prepStartedAt={prepStartedAt}
        estimatedPrepMinutes={20}
      />
    );

    // Should read estimatedReadyAt (10 min left, not overdue)
    const el = screen.getByRole('timer');
    expect(el).toHaveTextContent(/ready in/i);
    expect(el.className).not.toMatch(/text-danger/);
  });

  it('ticks every second via setInterval', async () => {
    // Start with 61 seconds left
    const prepStartedAt = new Date(NOW - 59 * 1000).toISOString();

    render(
      <PrepCountdown
        status="preparing"
        prepStartedAt={prepStartedAt}
        estimatedPrepMinutes={2} // 120 seconds total, 61 remain
      />
    );

    const before = screen.getByRole('timer').textContent;

    // Advance 1 second
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const after = screen.getByRole('timer').textContent;
    expect(after).not.toBe(before);
  });
});
