/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrdersList } from '../components/orders/orders-list';

const mockRemoveChannel = jest.fn();
const mockSubscribe = jest.fn((callback?: (status: string) => void) => {
  callback?.('SUBSCRIBED');
  return mockChannel;
});
const mockChannel = {
  on: jest.fn(() => mockChannel),
  subscribe: mockSubscribe,
};

jest.mock('next/link', () => {
  const Link = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('@ridendine/ui', () => ({
  // Keep real non-component exports (e.g. ORDER_STATUS_LABELS) while stubbing
  // the components below.
  ...jest.requireActual('@ridendine/ui'),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
  LiveIndicator: ({ status }: { status: string }) => <span data-testid="live-indicator">{status}</span>,
}));

jest.mock('@ridendine/db', () => ({
  chefStorefrontOrdersChannel: (storefrontId: string) => `chef-orders:${storefrontId}`,
  createBrowserClient: () => ({
    channel: jest.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
  parseOrdersRealtimeRow: (row: unknown) => row,
}));

const baseOrder = {
  id: 'order-1',
  order_number: 'RD-1001',
  status: 'pending',
  subtotal: 20,
  delivery_fee: 4,
  service_fee: 2,
  tax: 1.5,
  tip: 3,
  total: 30.5,
  payment_status: 'paid',
  estimated_ready_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  actual_ready_at: null,
  special_instructions: null,
  created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  customer: {
    id: 'customer-1',
    first_name: 'Sean',
    last_name: 'Finlay',
    phone: '555-0100',
    email: 'sean@example.com',
  },
  address: {
    id: 'address-1',
    address_line1: '10 King St W',
    city: 'Hamilton',
    state: 'ON',
    postal_code: 'L8P 1A1',
  },
  items: [
    {
      id: 'item-1',
      quantity: 2,
      unit_price: 10,
      total_price: 20,
      menu_item: { id: 'menu-1', name: 'Butter Chicken' },
    },
  ],
  delivery: {
    id: 'delivery-1',
    status: 'assigned',
    driver_id: 'driver-1',
  },
};

describe('OrdersList chef readiness workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows kitchen workflow summary and per-order next action guidance', () => {
    render(
      <OrdersList
        storefrontId="storefront-1"
        initialOrders={[
          baseOrder as any,
          { ...baseOrder, id: 'order-2', order_number: 'RD-1002', status: 'preparing' } as any,
          { ...baseOrder, id: 'order-3', order_number: 'RD-1003', status: 'ready_for_pickup' } as any,
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Kitchen workflow' })).toBeInTheDocument();
    expect(screen.getByText('New decisions')).toBeInTheDocument();
    expect(screen.getByText('In prep')).toBeInTheDocument();
    expect(screen.getAllByText('Ready for pickup').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kitchen step').length).toBeGreaterThan(0);
    expect(screen.getByText('Accept or reject')).toBeInTheDocument();
    expect(screen.getAllByText('Next action').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Accept order').length).toBeGreaterThan(0);
    expect(screen.getByText(/review the ticket and accept before the countdown expires/i)).toBeInTheDocument();
    expect(screen.getByText('Pickup handoff')).toBeInTheDocument();
    expect(screen.getAllByText('Waiting for driver').length).toBeGreaterThan(0);
  });

  it('keeps the existing mark_ready API payload and updates the visible workflow state', async () => {
    const preparingOrder = { ...baseOrder, id: 'order-2', order_number: 'RD-1002', status: 'preparing' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          order: {
            ...preparingOrder,
            status: 'ready_for_pickup',
            actual_ready_at: new Date().toISOString(),
          },
        },
      }),
    });

    render(<OrdersList storefrontId="storefront-1" initialOrders={[preparingOrder as any]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Ready' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/orders/order-2',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_ready',
            status: 'ready_for_pickup',
          }),
        })
      );
    });
    expect(await screen.findByText('Pickup handoff')).toBeInTheDocument();
    expect(screen.getAllByText('Waiting for driver').length).toBeGreaterThan(0);
  });
});
