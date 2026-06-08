/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import HistoryView from '../app/history/components/HistoryView';

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  Badge: ({
    children,
    className,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

const delivery = {
  id: 'delivery-1',
  order_id: 'order-1',
  driver_id: 'driver-1',
  status: 'delivered',
  pickup_address: '1 Pickup St, Hamilton',
  pickup_lat: null,
  pickup_lng: null,
  dropoff_address: '500 Main St E, Hamilton',
  dropoff_lat: null,
  dropoff_lng: null,
  estimated_pickup_at: null,
  actual_pickup_at: '2026-06-02T19:50:00.000Z',
  estimated_dropoff_at: null,
  actual_dropoff_at: '2026-06-02T20:30:00.000Z',
  distance_km: 4.2,
  delivery_fee: 7,
  driver_payout: 13.5,
  pickup_photo_url: null,
  dropoff_photo_url: null,
  customer_signature_url: null,
  notes: null,
  created_at: '2026-06-02T19:30:00.000Z',
  updated_at: '2026-06-02T20:30:00.000Z',
};

describe('HistoryView', () => {
  it('renders the delivery history command surface with proof metrics', () => {
    render(
      <HistoryView
        deliveries={[
          delivery as never,
          {
            ...delivery,
            id: 'delivery-2',
            dropoff_address: '42 Locke St S, Hamilton',
            actual_dropoff_at: '2026-06-03T17:15:00.000Z',
            distance_km: 6.1,
            driver_payout: 17.75,
          } as never,
        ]}
      />
    );

    expect(screen.getByText('Delivery history command center')).toBeInTheDocument();
    expect(screen.getByText('Completed deliveries')).toBeInTheDocument();
    expect(screen.getByText('Total earned')).toBeInTheDocument();
    expect(screen.getByText('Average payout')).toBeInTheDocument();
    expect(screen.getByText('Total distance')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delivery proof trail' })).toBeInTheDocument();
    expect(screen.getByText('Recent completion')).toBeInTheDocument();
    expect(screen.getAllByText('1 Pickup St to 42 Locke St S').length).toBeGreaterThan(0);
    expect(screen.getByText('10.3 km')).toBeInTheDocument();
    expect(screen.getByText('CA$31.25')).toBeInTheDocument();

    const ledger = screen.getByRole('region', { name: 'Completed delivery ledger' });
    expect(within(ledger).getByText('1 Pickup St to 500 Main St E')).toBeInTheDocument();
    expect(within(ledger).getByText('CA$13.50')).toBeInTheDocument();
    expect(within(ledger).getAllByText('Delivered').length).toBeGreaterThan(0);
  });

  it('renders a command empty state when there is no completed history', () => {
    render(<HistoryView deliveries={[]} />);

    expect(screen.getByText('Delivery history command center')).toBeInTheDocument();
    expect(screen.getByText('Completed deliveries')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CA$0.00').length).toBeGreaterThan(0);
    expect(screen.getByText('0.0 km')).toBeInTheDocument();
    expect(screen.getAllByText('No completed deliveries yet').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Completed delivery proof and payout records will appear here.').length
    ).toBeGreaterThan(0);
  });
});
