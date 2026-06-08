/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EarningsView from '../app/earnings/components/EarningsView';

jest.mock('next/link', () => {
  return function MockLink({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  Badge: ({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
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
  actual_pickup_at: null,
  estimated_dropoff_at: null,
  actual_dropoff_at: new Date().toISOString(),
  distance_km: 4.2,
  delivery_fee: 7,
  driver_payout: 13.5,
  pickup_photo_url: null,
  dropoff_photo_url: null,
  customer_signature_url: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  base_amount: 9,
  tip_amount: 2.5,
  bonus_amount: 1,
  adjustment_amount: 1,
};

describe('EarningsView', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
  });

  it('uses dynamic currency copy and shows driver trust payout details', () => {
    render(
      <EarningsView
        deliveries={[delivery as never]}
        availableBalanceCents={12550}
        currency="CAD"
        instantPayoutsEnabled
        pendingInstantPayoutRequests={[
          {
            id: 'ipr-1',
            amountCents: 5000,
            feeCents: 75,
            status: 'pending',
            requestedAt: '2026-06-15T16:00:00.000Z',
          },
        ]}
        payoutAccountStatus={{
          connected: true,
          status: 'active',
          payoutsEnabled: true,
          chargesEnabled: true,
          onboardingCompletedAt: '2026-06-01T12:00:00.000Z',
        }}
      />
    );

    expect(screen.getByText('Amount (CAD)')).toBeInTheDocument();
    expect(screen.queryByText('Amount (USD)')).not.toBeInTheDocument();
    expect(screen.getAllByText('CA$13.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CA$74.75').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/CA\$125\.50 ledger balance/i)).toBeInTheDocument();
    expect(screen.getByText('Base delivery pay')).toBeInTheDocument();
    expect(screen.getByText('Tips')).toBeInTheDocument();
    expect(screen.getByText('Bonuses')).toBeInTheDocument();
    expect(screen.getByText('Adjustments')).toBeInTheDocument();
    expect(screen.getByText(/delivery-history estimate/i)).toBeInTheDocument();
    expect(screen.getByText('Instant payout fee preview')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending instant payout requests' })).toBeInTheDocument();
    expect(screen.getByText(/CA\$50\.00 requested/i)).toBeInTheDocument();
    expect(screen.getByText(/Next scheduled payout/i)).toBeInTheDocument();
    expect(screen.getByText(/Your payout account is active/i)).toBeInTheDocument();
  });

  it('rejects instant payout requests above the net available balance', () => {
    render(
      <EarningsView
        deliveries={[delivery as never]}
        availableBalanceCents={12550}
        currency="CAD"
        instantPayoutsEnabled
        pendingInstantPayoutRequests={[
          {
            id: 'ipr-1',
            amountCents: 5000,
            feeCents: 75,
            status: 'pending',
            requestedAt: '2026-06-15T16:00:00.000Z',
          },
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText('Amount (CAD)'), { target: { value: '74.00' } });
    fireEvent.click(screen.getByRole('button', { name: /request instant payout/i }));

    expect(screen.getByText(/Amount exceeds available balance after pending instant payouts and fees/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('is transparent for production-shaped delivery rows without optional earning fields', () => {
    const productionDelivery = {
      ...delivery,
      id: 'delivery-production',
      driver_payout: 13.5,
      base_amount: undefined,
      tip_amount: undefined,
      bonus_amount: undefined,
      adjustment_amount: undefined,
    };

    render(
      <EarningsView
        deliveries={[productionDelivery as never]}
        availableBalanceCents={1350}
        currency="CAD"
        instantPayoutsEnabled={false}
      />
    );

    expect(screen.getByText('Delivery pay estimate')).toBeInTheDocument();
    expect(screen.getByText(/delivery-history estimate/i)).toBeInTheDocument();
    expect(screen.getByText('Base delivery pay')).toBeInTheDocument();
    expect(screen.getAllByText('CA$13.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CA$0.00').length).toBeGreaterThanOrEqual(3);
  });

  it('falls back to CAD when currency is malformed', () => {
    render(
      <EarningsView
        deliveries={[delivery as never]}
        availableBalanceCents={12550}
        currency="not-a-currency"
        instantPayoutsEnabled
      />
    );

    expect(screen.getByText('Amount (CAD)')).toBeInTheDocument();
    expect(screen.getAllByText('CA$13.50').length).toBeGreaterThan(0);
  });
});
