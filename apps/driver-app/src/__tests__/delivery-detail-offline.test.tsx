/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeliveryDetail from '../app/delivery/[id]/components/DeliveryDetail';
import { useLocationTracker } from '@/hooks/use-location-tracker';
import { OfflineOutbox, type OutboxEntry, type OutboxStore } from '@/lib/offline-outbox';

const refreshMock = jest.fn();
const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
}));

jest.mock('@ridendine/ui', () => ({
  ...jest.requireActual('@ridendine/ui'),
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

const mockOutboxRef: { current: OfflineOutbox | null } = { current: null };

jest.mock('@/lib/offline-outbox', () => {
  const actual = jest.requireActual('@/lib/offline-outbox');
  return {
    ...actual,
    getOfflineOutbox: () => mockOutboxRef.current,
  };
});

const mockUseLocationTracker = useLocationTracker as jest.Mock;

const OFFLINE_503 = {
  ok: false,
  status: 503,
  json: async () => ({ error: 'You appear to be offline. Reconnect and try again.' }),
};

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
  pickup_phone: '555-0202',
};

const orderFixture = {
  order_number: 'RD-1001',
  special_instructions: null,
  customer_phone: '555-0101',
};

function createMemoryStore(): OutboxStore & { rows: OutboxEntry[] } {
  let seq = 0;
  const rows: OutboxEntry[] = [];
  return {
    rows,
    async add(entry) {
      const full = { ...entry, seq: (seq += 1) } as OutboxEntry;
      rows.push(full);
      return full;
    },
    async all() {
      return [...rows].sort((a, b) => a.seq - b.seq);
    },
    async remove(id) {
      const index = rows.findIndex((row) => row.id === id);
      if (index >= 0) rows.splice(index, 1);
    },
  };
}

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

describe('DeliveryDetail offline outbox', () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    refreshMock.mockClear();
    pushMock.mockClear();
    mockUseLocationTracker.mockReturnValue({
      lastLocation: null,
      lastPostedAt: null,
      permissionState: 'granted',
      locationError: null,
      isPosting: false,
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    });
    store = createMemoryStore();
    mockOutboxRef.current = new OfflineOutbox(store, (url, init) =>
      (global.fetch as jest.Mock)(url, init)
    );
    global.fetch = jest.fn() as jest.Mock;
    window.open = jest.fn();
    setNavigatorOnLine(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queues a status update on the offline 503 and shows the pending-sync banner', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(OFFLINE_503);

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Navigation to Pickup' }));

    expect(await screen.findByText(/1 action waiting to sync/i)).toBeInTheDocument();
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ kind: 'status', deliveryId: 'del-1' });
    // Status was NOT advanced optimistically; navigation did not open.
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Waiting to sync...' })).toBeDisabled();
    expect(screen.getByText(/saved and will sync automatically/i)).toBeInTheDocument();
  });

  it('queues a status update when fetch rejects at the network level', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Navigation to Pickup' }));

    expect(await screen.findByText(/1 action waiting to sync/i)).toBeInTheDocument();
    expect(store.rows).toHaveLength(1);
  });

  it('does not queue real server rejections', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Invalid status transition' }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Navigation to Pickup' }));

    expect(await screen.findByText('Invalid status transition')).toBeInTheDocument();
    expect(store.rows).toHaveLength(0);
    expect(screen.queryByText(/waiting to sync/i)).not.toBeInTheDocument();
  });

  it('replays queued mutations when connectivity returns and refreshes the page', async () => {
    setNavigatorOnLine(false);
    await mockOutboxRef.current!.enqueue({
      kind: 'status',
      deliveryId: 'del-1',
      request: {
        url: '/api/deliveries/del-1',
        method: 'PATCH',
        body: JSON.stringify({ status: 'en_route_to_pickup' }),
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);
    expect(await screen.findByText(/1 action waiting to sync/i)).toBeInTheDocument();

    setNavigatorOnLine(true);
    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/deliveries/del-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'en_route_to_pickup' }),
        })
      );
    });
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(store.rows).toHaveLength(0);
    await waitFor(() =>
      expect(screen.queryByText(/waiting to sync/i)).not.toBeInTheDocument()
    );
    // Local status advanced to the replayed transition.
    expect(await screen.findByRole('button', { name: 'Arrived at Restaurant' })).toBeInTheDocument();
  });

  it('drops entries the server rejects with a 4xx on replay and surfaces a notice', async () => {
    await mockOutboxRef.current!.enqueue({
      kind: 'status',
      deliveryId: 'del-1',
      request: {
        url: '/api/deliveries/del-1',
        method: 'PATCH',
        body: JSON.stringify({ status: 'en_route_to_pickup' }),
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Invalid status transition' }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    expect(
      await screen.findByText(/could not be applied: Invalid status transition/i)
    ).toBeInTheDocument();
    expect(store.rows).toHaveLength(0);
    expect(screen.queryByText(/waiting to sync/i)).not.toBeInTheDocument();
  });

  it('queues pickup proof with the photo data URL when uploads fail offline', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    class MockFileReader {
      result = 'data:image/jpeg;base64,proof';
      onloadend: (() => void) | null = null;
      readAsDataURL() {
        this.onloadend?.();
      }
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;

    const { container } = render(
      <DeliveryDetail
        delivery={{ ...deliveryFixture, status: 'arrived_at_pickup' } as any}
        order={orderFixture}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Pickup' }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['proof'], 'pickup.jpg', { type: 'image/jpeg' })] },
    });
    await screen.findByAltText('Pickup proof');
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirm Pickup' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    expect(await screen.findByText(/1 action waiting to sync/i)).toBeInTheDocument();
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ kind: 'proof', deliveryId: 'del-1' });
    expect(JSON.parse(store.rows[0]!.request.body)).toMatchObject({
      eventType: 'pickup',
      proofUrl: 'data:image/jpeg;base64,proof',
    });
    // Status stays pending rather than advancing to picked up.
    expect(screen.getByRole('button', { name: 'Waiting to sync...' })).toBeDisabled();
  });
});
