/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeliveryDetail from '../app/delivery/[id]/components/DeliveryDetail';

const refreshMock = jest.fn();
const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    className,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: string;
    size?: string;
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/hooks/use-location-tracker', () => ({
  useLocationTracker: jest.fn(),
}));

jest.mock('@/components/map/route-map', () => ({
  RouteMap: () => <div data-testid="route-map" />,
}));

const deliveryFixture = {
  id: 'del-1',
  driver_id: 'driver-1',
  status: 'accepted',
  pickup_address: '10 King St W, Hamilton, ON',
  pickup_lat: 43.255,
  pickup_lng: -79.869,
  dropoff_address: '100 Main St E, Hamilton, ON',
  dropoff_lat: 43.254,
  dropoff_lng: -79.866,
  distance_km: 3.4,
  delivery_fee: 6.25,
  driver_payout: 8.5,
};

const orderFixture = {
  order_number: 'RD-1001',
  special_instructions: 'Leave at the front desk',
  customer_phone: '555-0101',
};

describe('DeliveryDetail workflow clarity', () => {
  beforeEach(() => {
    refreshMock.mockClear();
    pushMock.mockClear();
    global.fetch = jest.fn() as jest.Mock;
    window.open = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows current work, pickup stage, and the next driver action', () => {
    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    expect(screen.getByRole('heading', { name: 'Delivery work' })).toBeInTheDocument();
    expect(screen.getByText('Current step')).toBeInTheDocument();
    expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pickup').length).toBeGreaterThan(0);
    expect(screen.getByText('Next action')).toBeInTheDocument();
    expect(screen.getAllByText('Start Navigation to Pickup').length).toBeGreaterThan(0);
    expect(screen.getByText(/head to the restaurant/i)).toBeInTheDocument();
  });

  it('handles assigned deliveries as pickup work', () => {
    render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'assigned' } as any}
        order={orderFixture}
      />
    );

    expect(screen.getByRole('heading', { name: 'Delivery work' })).toBeInTheDocument();
    expect(screen.getAllByText('Assigned').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pickup').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Start Navigation to Pickup').length).toBeGreaterThan(0);
  });

  it('submits a delivery issue to Ops and confirms it was sent', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { issue: { id: 'exc-1' } } }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /report issue to ops/i }));
    fireEvent.change(screen.getByLabelText('Issue type'), {
      target: { value: 'chef_delay' },
    });
    fireEvent.change(screen.getByLabelText('Issue notes'), {
      target: { value: 'Chef needs another 20 minutes.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send issue to Ops' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/deliveries/del-1/issue',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'chef_delay',
            notes: 'Chef needs another 20 minutes.',
          }),
        })
      );
    });
    expect(await screen.findByText(/ops has received this issue/i)).toBeInTheDocument();
  });

  it('keeps issue notes visible when Ops issue submission fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Issue could not be recorded' }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /report issue to ops/i }));
    fireEvent.change(screen.getByLabelText('Issue notes'), {
      target: { value: 'Customer is not answering the phone.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send issue to Ops' }));

    expect(await screen.findByText('Issue could not be recorded')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Customer is not answering the phone.')).toBeInTheDocument();
  });
});
