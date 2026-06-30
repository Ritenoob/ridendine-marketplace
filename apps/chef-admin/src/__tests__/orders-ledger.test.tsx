/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OrdersLedger, type LedgerOrder } from '../components/orders/orders-ledger';

jest.mock('next/link', () => {
  const Link = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('@ridendine/ui', () => ({
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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

function makeOrder(overrides: Partial<LedgerOrder> = {}): LedgerOrder {
  return {
    id: 'order-1',
    order_number: 'RD-1001',
    status: 'completed',
    payment_status: 'paid',
    total: 30.5,
    created_at: new Date('2026-06-20T18:00:00Z').toISOString(),
    estimated_ready_at: null,
    actual_ready_at: new Date('2026-06-20T18:20:00Z').toISOString(),
    completed_at: new Date('2026-06-20T18:45:00Z').toISOString(),
    delivered_at: new Date('2026-06-20T18:45:00Z').toISOString(),
    cancelled_at: null,
    customer: { id: 'c1', first_name: 'Sean', last_name: 'Finlay', phone: '555-0100', email: 'sean@example.com' },
    delivery: { id: 'd1', status: 'delivered' },
    ...overrides,
  };
}

describe('OrdersLedger', () => {
  it('renders order history rows and is read-only (no workflow actions)', () => {
    render(
      <OrdersLedger
        storefrontId="storefront-1"
        initialOrders={[
          makeOrder(),
          makeOrder({ id: 'order-2', order_number: 'RD-1002', status: 'pending', customer: { id: 'c2', first_name: 'Amy', last_name: 'Chen', phone: null, email: null } }),
        ]}
      />
    );

    expect(screen.getByText('RD-1001')).toBeInTheDocument();
    expect(screen.getByText('RD-1002')).toBeInTheDocument();
    // Read-only ledger: no live kitchen workflow controls live here anymore.
    expect(screen.queryByText('Kitchen workflow')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark ready/i })).not.toBeInTheDocument();
    // Each row links into the per-order detail page for support/traceability.
    expect(screen.getAllByRole('link', { name: 'Details' }).length).toBe(2);
  });

  it('filters by free-text search across order number and customer', () => {
    render(
      <OrdersLedger
        storefrontId="storefront-1"
        initialOrders={[
          makeOrder(),
          makeOrder({ id: 'order-2', order_number: 'RD-1002', customer: { id: 'c2', first_name: 'Amy', last_name: 'Chen', phone: null, email: null } }),
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/order #, customer/i), { target: { value: 'Amy' } });

    expect(screen.queryByText('RD-1001')).not.toBeInTheDocument();
    expect(screen.getByText('RD-1002')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 2 orders/i)).toBeInTheDocument();
  });

  it('filters to issues and exceptions only', () => {
    render(
      <OrdersLedger
        storefrontId="storefront-1"
        initialOrders={[
          makeOrder(),
          makeOrder({ id: 'order-2', order_number: 'RD-1002', status: 'cancelled' }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.queryByText('RD-1001')).not.toBeInTheDocument();
    expect(screen.getByText('RD-1002')).toBeInTheDocument();
  });

  it('shows an empty state when no orders match', () => {
    render(<OrdersLedger storefrontId="storefront-1" initialOrders={[makeOrder()]} />);

    fireEvent.change(screen.getByPlaceholderText(/order #, customer/i), { target: { value: 'no-such-order' } });

    expect(screen.getByText(/No orders match the current filters/i)).toBeInTheDocument();
  });
});
