/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KitchenOrderQueue } from '../kitchen-order-queue';
import type { KitchenTicket } from '@/lib/kitchen';

// --- Mocks ---

jest.mock('@/lib/sound', () => ({ playNewOrderChime: jest.fn() }));

jest.mock('@/components/kitchen/prep-countdown', () => ({
  PrepCountdown: ({ status }: { status: string }) => (
    <span data-testid="prep-countdown">{status}</span>
  ),
}));

jest.mock('@/components/orders/order-toast', () => ({
  OrderToast: () => null,
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Badge: ({
    children,
    variant,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <span data-variant={variant} className={className} onClick={onClick}>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  LiveIndicator: ({ status }: { status: string }) => (
    <span data-testid="live-indicator">{status}</span>
  ),
  ORDER_STATUS_LABELS: {
    pending: 'New',
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready',
  },
}));

// Mock the realtime hook so it does nothing (realtime coverage is in hook unit tests)
jest.mock('@/hooks/use-storefront-orders-realtime', () => ({
  useStorefrontOrdersRealtime: jest.fn(),
}));

jest.mock('@ridendine/utils', () => ({
  KITCHEN_NEXT_TRANSITION: {
    pending: { action: 'accept', buttonLabel: 'Accept', nextStatus: 'accepted' },
    accepted: { action: 'start_preparing', buttonLabel: 'Start Preparing', nextStatus: 'preparing' },
    preparing: { action: 'mark_ready', buttonLabel: 'Mark Ready', nextStatus: 'ready_for_pickup' },
  },
  KITCHEN_REJECT_TRANSITION: { action: 'reject', buttonLabel: 'Reject', nextStatus: 'rejected' },
  getKitchenWorkflowStep: jest.fn(() => ({ label: 'Next step', description: '' })),
}));

// --- Test data ---

const NOW = new Date('2026-06-19T12:00:00Z').getTime();

function ticket(overrides: Partial<KitchenTicket> & Pick<KitchenTicket, 'id' | 'status'>): KitchenTicket {
  return {
    orderNumber: `RD-${overrides.id}`,
    createdAt: new Date(NOW - 5 * 60 * 1000).toISOString(),
    prepStartedAt: null,
    estimatedReadyAt: null,
    estimatedPrepMinutes: 20,
    specialInstructions: null,
    customerName: 'Test Customer',
    items: [{ name: 'Butter Chicken', quantity: 2, specialInstructions: null }],
    totalQty: 2,
    ...overrides,
  };
}

// --- Tests ---

describe('KitchenOrderQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders pending tickets first, then by urgency', () => {
    const overdue = ticket({
      id: 'ord-overdue',
      status: 'preparing',
      prepStartedAt: new Date(NOW - 30 * 60 * 1000).toISOString(), // 30 min ago
      estimatedPrepMinutes: 20, // 10 min overdue
    });
    const onTime = ticket({
      id: 'ord-ontime',
      status: 'preparing',
      prepStartedAt: new Date(NOW - 5 * 60 * 1000).toISOString(), // 5 min ago
      estimatedPrepMinutes: 20, // 15 min left
    });
    const pending = ticket({ id: 'ord-pending', status: 'pending' });

    render(
      <KitchenOrderQueue
        tickets={[overdue, onTime, pending]}
        storefrontId="sf-1"
      />
    );

    const cards = screen.getAllByText(/RD-ord-/i);
    // pending first, then overdue, then on-time
    expect(cards[0]).toHaveTextContent('RD-ord-pending');
    expect(cards[1]).toHaveTextContent('RD-ord-overdue');
    expect(cards[2]).toHaveTextContent('RD-ord-ontime');
  });

  it('PATCHes the correct action and optimistically advances status on accept', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { order: { ...ticket({ id: 'ord-1', status: 'pending' }), status: 'accepted' } },
      }),
    });

    render(
      <KitchenOrderQueue
        tickets={[ticket({ id: 'ord-1', status: 'pending' })]}
        storefrontId="sf-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    // Optimistic update - button label changes immediately
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/orders/ord-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ action: 'accept', status: 'accepted' }),
      })
    );
  });

  it('patches customer name on the hydrated second onInsert call', async () => {
    const { useStorefrontOrdersRealtime } = require('@/hooks/use-storefront-orders-realtime') as {
      useStorefrontOrdersRealtime: jest.Mock;
    };
    let capturedOnInsert: ((o: unknown) => void) | null = null;
    useStorefrontOrdersRealtime.mockImplementation(
      (_id: string, callbacks: { onInsert: (o: unknown) => void }) => {
        capturedOnInsert = callbacks.onInsert;
      }
    );

    render(<KitchenOrderQueue tickets={[]} storefrontId="sf-1" />);

    // First call: thin INSERT (no customer)
    act(() => {
      capturedOnInsert!({
        id: 'ord-new',
        order_number: 'RD-999',
        status: 'pending',
        created_at: new Date(NOW).toISOString(),
        customer: null,
      });
    });
    expect(screen.getByText('RD-999')).toBeInTheDocument();
    expect(screen.queryByText(/Alice Chen/)).toBeNull();

    // Second call: hydrated INSERT (same id, now with customer)
    act(() => {
      capturedOnInsert!({
        id: 'ord-new',
        order_number: 'RD-999',
        status: 'pending',
        created_at: new Date(NOW).toISOString(),
        customer: { first_name: 'Alice', last_name: 'Chen' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Alice Chen/)).toBeInTheDocument();
    });
  });

  it('resets the new-order badge count when clicked', async () => {
    const { useStorefrontOrdersRealtime } = require('@/hooks/use-storefront-orders-realtime') as {
      useStorefrontOrdersRealtime: jest.Mock;
    };
    let capturedOnInsert: ((o: unknown) => void) | null = null;
    useStorefrontOrdersRealtime.mockImplementation(
      (_id: string, callbacks: { onInsert: (o: unknown) => void }) => {
        capturedOnInsert = callbacks.onInsert;
      }
    );

    render(<KitchenOrderQueue tickets={[]} storefrontId="sf-1" />);

    act(() => {
      capturedOnInsert!({
        id: 'ord-a',
        order_number: 'RD-001',
        status: 'pending',
        created_at: new Date(NOW).toISOString(),
        customer: null,
      });
    });

    await waitFor(() => expect(screen.getByText('1 new')).toBeInTheDocument());

    // Click badge to dismiss
    fireEvent.click(screen.getByText('1 new'));

    await waitFor(() => expect(screen.queryByText('1 new')).toBeNull());
  });

  it('does NOT revert an in-flight order when a stale tickets prop arrives', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { order: { ...ticket({ id: 'ord-2', status: 'accepted' }), status: 'preparing' } },
      }),
    });

    const { rerender } = render(
      <KitchenOrderQueue
        tickets={[ticket({ id: 'ord-2', status: 'accepted' }), ticket({ id: 'ord-3', status: 'pending' })]}
        storefrontId="sf-1"
      />
    );

    // Click Start Preparing on ord-2
    fireEvent.click(screen.getByRole('button', { name: 'Start Preparing' }));

    // Wait for the optimistic update to apply
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Start Preparing' })).toBeNull();
    });

    // Simulate a 30s poll returning STALE data (ord-2 still shows 'accepted')
    rerender(
      <KitchenOrderQueue
        tickets={[ticket({ id: 'ord-2', status: 'accepted' }), ticket({ id: 'ord-3', status: 'pending' })]}
        storefrontId="sf-1"
      />
    );

    // ord-2 must still reflect the optimistic state (Mark Ready button = preparing)
    // NOT reverted to Accept button (accepted)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Start Preparing' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });
  });
});
