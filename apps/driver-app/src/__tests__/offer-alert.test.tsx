/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OfferAlert } from '../components/offer-alert';

const mockRemoveChannel = jest.fn();
const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
};
const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
};
const mockBroadcastHandlers: Record<string, (message: { payload: unknown }) => void> = {};

jest.mock('@ridendine/db', () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}));

jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

function broadcastOffer(overrides: Record<string, unknown> = {}) {
  act(() => {
    mockBroadcastHandlers.offer?.({
      payload: {
        attemptId: 'att-1',
        deliveryId: 'del-1',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
        pickupAddress: '123 King St W, Hamilton',
        dropoffAddress: '500 Main St E, Hamilton',
        estimatedDistanceKm: 4,
        estimatedRouteSeconds: 900,
        estimatedPayout: 12,
        customerTip: 3,
        orderNumber: 'RD-1007',
        storefrontName: 'Every Bite Yum',
        ...overrides,
      },
    });
  });
}

describe('OfferAlert decision support', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-07T18:00:00.000Z'));
    mockBroadcastHandlers.offer = undefined as never;
    mockBroadcastHandlers.offer_expired = undefined as never;
    mockChannel.on.mockImplementation(
      (_type: string, filter: { event: string }, handler: (message: { payload: unknown }) => void) => {
        mockBroadcastHandlers[filter.event] = handler;
        return mockChannel;
      }
    );
    mockChannel.subscribe.mockImplementation((handler: (status: string) => void) => {
      handler('SUBSCRIBED');
      return mockChannel;
    });
    mockSupabase.channel.mockClear();
    mockRemoveChannel.mockClear();
    global.fetch = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
    (window as unknown as { AudioContext?: unknown }).AudioContext = jest.fn(() => ({
      createOscillator: () => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 0 },
        type: 'sine',
      }),
      createGain: () => ({
        connect: jest.fn(),
        gain: { value: 0 },
      }),
      destination: {},
      currentTime: 0,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders countdown, payout, distance, pay per km, addresses, route time, tip, and storefront', () => {
    render(<OfferAlert driverId="driver-1" isOnline />);

    broadcastOffer();

    expect(screen.getByText('45s')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('4.0 km')).toBeInTheDocument();
    expect(screen.getByText('$3.00/km')).toBeInTheDocument();
    expect(screen.getByText('Pickup from')).toBeInTheDocument();
    expect(screen.getByText('123 King St W, Hamilton')).toBeInTheDocument();
    expect(screen.getByText('Deliver to')).toBeInTheDocument();
    expect(screen.getByText('500 Main St E, Hamilton')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('Tip included: $3.00')).toBeInTheDocument();
    expect(screen.getByText('Every Bite Yum')).toBeInTheDocument();
    expect(screen.getByText('Order RD-1007')).toBeInTheDocument();
  });

  it('sends reasoned decline options and shows decline loading state', async () => {
    const fetchPromise = new Promise<Response>(() => undefined);
    (global.fetch as jest.Mock).mockReturnValue(fetchPromise);
    render(<OfferAlert driverId="driver-1" isOnline />);
    broadcastOffer();

    fireEvent.change(screen.getByLabelText('Decline reason'), { target: { value: 'too_far' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(screen.getByRole('button', { name: 'Declining...' })).toBeDisabled();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/offers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          attemptId: 'att-1',
          driverId: 'driver-1',
          action: 'decline',
          reason: 'too_far',
        }),
      })
    );
  });

  it('shows accept loading without changing the decline button label', async () => {
    const fetchPromise = new Promise<Response>(() => undefined);
    (global.fetch as jest.Mock).mockReturnValue(fetchPromise);
    render(<OfferAlert driverId="driver-1" isOnline />);
    broadcastOffer();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(screen.getByRole('button', { name: 'Accepting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });

  it('shows an expired or already accepted offer error after a failed response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { code: 'OFFER_ALREADY_ACCEPTED', message: 'Already accepted' },
      }),
    });
    render(<OfferAlert driverId="driver-1" isOnline />);
    broadcastOffer();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(
      await screen.findByText('Another driver already accepted this offer.')
    ).toBeInTheDocument();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { code: 'OFFER_EXPIRED', message: 'Expired' },
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(await screen.findByText('This offer has expired.')).toBeInTheDocument();
  });

  it('keeps the offer visible when a decline response fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { code: 'OFFER_EXPIRED', message: 'Expired' },
      }),
    });
    render(<OfferAlert driverId="driver-1" isOnline />);
    broadcastOffer();

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(await screen.findByText('This offer has expired.')).toBeInTheDocument();
    expect(screen.getByText('New Delivery!')).toBeInTheDocument();
  });
});
