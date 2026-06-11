/**
 * SavedCardSelector mount behavior.
 *
 * Covers: auto-select of the first saved card only after the list state has
 * committed, no onSelect after unmount mid-fetch, and the inline error
 * message when the saved-cards fetch fails.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SavedCardSelector } from '@/components/checkout/saved-card-selector';

const savedCard = {
  id: 'pm_1',
  card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
};

describe('SavedCardSelector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('auto-selects the first saved card after the list renders', async () => {
    global.fetch = jest.fn(async () => ({
      json: async () => ({ success: true, data: [savedCard] }),
    })) as unknown as typeof fetch;
    const onSelect = jest.fn();

    render(<SavedCardSelector onSelect={onSelect} />);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('pm_1', false);
    });
    expect(onSelect).toHaveBeenCalledTimes(1);

    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].value).toBe('pm_1');
    expect(radios[0].checked).toBe(true);
  });

  it('does not call onSelect when unmounted while the fetch is in flight', async () => {
    let resolveFetch!: (value: unknown) => void;
    global.fetch = jest.fn(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    ) as unknown as typeof fetch;
    const onSelect = jest.fn();

    const { unmount } = render(<SavedCardSelector onSelect={onSelect} />);
    unmount();

    await act(async () => {
      resolveFetch({ json: async () => ({ success: true, data: [savedCard] }) });
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows an inline message instead of failing silently when the fetch errors', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const onSelect = jest.fn();

    render(<SavedCardSelector onSelect={onSelect} />);

    expect(
      await screen.findByText(/load saved cards/i)
    ).toBeDefined();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the inline message when the API responds unsuccessfully', async () => {
    global.fetch = jest.fn(async () => ({
      json: async () => ({ success: false, error: 'nope' }),
    })) as unknown as typeof fetch;
    const onSelect = jest.fn();

    render(<SavedCardSelector onSelect={onSelect} />);

    expect(await screen.findByText(/load saved cards/i)).toBeDefined();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
