/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeliveryDetail from '../app/delivery/[id]/components/DeliveryDetail';
import { useLocationTracker } from '@/hooks/use-location-tracker';

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

const mockUseLocationTracker = useLocationTracker as jest.Mock;

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

const trackerState = {
  lastLocation: null,
  lastPostedAt: null,
  permissionState: 'granted',
  locationError: null,
  isPosting: false,
  startTracking: jest.fn(),
  stopTracking: jest.fn(),
};

class MockFileReader {
  result = 'data:image/jpeg;base64,proof';
  onloadend: (() => void) | null = null;

  readAsDataURL() {
    this.onloadend?.();
  }
}

describe('DeliveryDetail workflow clarity', () => {
  beforeEach(() => {
    refreshMock.mockClear();
    pushMock.mockClear();
    mockUseLocationTracker.mockReturnValue(trackerState);
    global.fetch = jest.fn() as jest.Mock;
    global.FileReader = MockFileReader as unknown as typeof FileReader;
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () =>
        ({
          fillStyle: '',
          fillRect: jest.fn(),
          strokeStyle: '',
          lineWidth: 0,
          lineCap: '',
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          stroke: jest.fn(),
        }) as unknown as CanvasRenderingContext2D
    );
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

  it('includes the latest tracked coordinates when submitting a delivery issue', async () => {
    mockUseLocationTracker.mockReturnValue({
      ...trackerState,
      lastLocation: { lat: 43.2601, lng: -79.8712 },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { issue: { id: 'exc-1' } } }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /report issue to ops/i }));
    fireEvent.change(screen.getByLabelText('Issue notes'), {
      target: { value: 'Road closure near the customer.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send issue to Ops' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/deliveries/del-1/issue',
        expect.objectContaining({
          body: JSON.stringify({
            issueType: 'chef_delay',
            notes: 'Road closure near the customer.',
            lat: 43.2601,
            lng: -79.8712,
          }),
        })
      );
    });
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

  it('requires pickup proof before marking the order picked up and submits it through the proof route', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url === '/api/upload') {
        return { ok: true, json: async () => ({ url: 'https://example.com/pickup.jpg' }) };
      }
      if (url === '/api/deliveries/del-1/proof') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: false, json: async () => ({ error: 'Unexpected request' }) };
    });

    const { container } = render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'arrived_at_pickup' } as any}
        order={orderFixture}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Pickup' }));
    expect(screen.getByRole('heading', { name: 'Confirm Pickup' })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button', { name: 'Confirm Pickup' })
        .some((button) => button.hasAttribute('disabled'))
    ).toBe(true);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['proof'], 'pickup.jpg', { type: 'image/jpeg' })] },
    });

    await screen.findByAltText('Pickup proof');
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirm Pickup' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/deliveries/del-1/proof',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'pickup',
            proofUrl: 'https://example.com/pickup.jpg',
          }),
        })
      );
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/deliveries/del-1', expect.anything());
  });

  it('requires dropoff proof before delivering and submits it through the proof route', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url === '/api/upload') {
        return { ok: true, json: async () => ({ url: 'https://example.com/dropoff.jpg' }) };
      }
      if (url === '/api/deliveries/del-1/proof') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: false, json: async () => ({ error: 'Unexpected request' }) };
    });

    const { container } = render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'arrived_at_dropoff' } as any}
        order={orderFixture}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete Delivery' }));
    expect(screen.getByRole('heading', { name: 'Complete Delivery' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['proof'], 'dropoff.jpg', { type: 'image/jpeg' })] },
    });

    await screen.findByAltText('Proof');
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/deliveries/del-1/proof',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'dropoff',
            proofUrl: 'https://example.com/dropoff.jpg',
          }),
        })
      );
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/deliveries/del-1', expect.anything());
  });

  it('shows customer instructions only on the dropoff leg', () => {
    const { unmount } = render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'arrived_at_pickup' } as any}
        order={orderFixture}
      />
    );

    expect(screen.queryByText(/leave at the front desk/i)).not.toBeInTheDocument();
    unmount();

    render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'en_route_to_dropoff' } as any}
        order={orderFixture}
      />
    );

    expect(screen.getByText(/leave at the front desk/i)).toBeInTheDocument();
  });

  it('shows restaurant contact only on the pickup leg', () => {
    const { unmount } = render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'en_route_to_pickup' } as any}
        order={orderFixture}
      />
    );

    expect(screen.getByRole('button', { name: 'Call Restaurant' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Call Customer' })).not.toBeInTheDocument();
    unmount();

    render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'picked_up' } as any}
        order={orderFixture}
      />
    );

    expect(screen.queryByRole('button', { name: 'Call Restaurant' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Call Customer' })).toBeInTheDocument();
  });
});
