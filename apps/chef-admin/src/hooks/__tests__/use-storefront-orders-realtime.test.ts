/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useStorefrontOrdersRealtime } from '../use-storefront-orders-realtime';

// --- Mock Supabase realtime primitives ---

let capturedPayloadHandler: ((payload: unknown) => void) | null = null;
let capturedSubscribeCallback: ((status: string) => void) | null = null;
const mockRemoveChannel = jest.fn();

const mockChannel = {
  on: jest.fn((_event: string, _filter: unknown, handler: (p: unknown) => void) => {
    capturedPayloadHandler = handler;
    return mockChannel;
  }),
  subscribe: jest.fn((cb: (status: string) => void) => {
    capturedSubscribeCallback = cb;
    return mockChannel;
  }),
};

jest.mock('@ridendine/db', () => ({
  chefStorefrontOrdersChannel: (id: string) => `chef:${id}:orders`,
  createBrowserClient: () => ({
    channel: jest.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
  parseOrdersRealtimeRow: (row: unknown) => {
    if (typeof row !== 'object' || row === null) return null;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.order_number !== 'string') return null;
    return r; // pass-through so tests control validity
  },
}));

// --- Setup ---

beforeEach(() => {
  capturedPayloadHandler = null;
  capturedSubscribeCallback = null;
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({}),
  }) as jest.Mock;
});

// --- Tests ---

describe('useStorefrontOrdersRealtime', () => {
  it('calls onInsert with the thin row then with the hydrated order on INSERT', async () => {
    const onInsert = jest.fn();
    const onUpdate = jest.fn();

    const hydratedOrder = {
      id: 'order-1',
      order_number: 'RD-1001',
      status: 'pending',
      storefront_id: 'sf-1',
      customer: { first_name: 'Jane', last_name: 'Doe' },
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { order: hydratedOrder } }),
    });

    renderHook(() =>
      useStorefrontOrdersRealtime('sf-1', { onInsert, onUpdate })
    );

    // Deliver INSERT via captured handler
    const thinRow = {
      id: 'order-1',
      order_number: 'RD-1001',
      status: 'pending',
      storefront_id: 'sf-1',
      total: 25,
      created_at: new Date().toISOString(),
    };
    expect(capturedPayloadHandler).not.toBeNull();
    await capturedPayloadHandler!({ eventType: 'INSERT', new: thinRow });

    // onInsert called immediately with thin row
    expect(onInsert).toHaveBeenCalledWith(thinRow);

    // Wait for hydration
    await new Promise((r) => setTimeout(r, 0));

    // onInsert called again with the hydrated full order
    expect(onInsert).toHaveBeenCalledWith(hydratedOrder);
    expect(onInsert).toHaveBeenCalledTimes(2);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('calls onUpdate with the thin row then the hydrated order on UPDATE', async () => {
    const onInsert = jest.fn();
    const onUpdate = jest.fn();

    const hydratedOrder = {
      id: 'order-2',
      order_number: 'RD-1002',
      status: 'preparing',
      storefront_id: 'sf-1',
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ order: hydratedOrder }),
    });

    renderHook(() =>
      useStorefrontOrdersRealtime('sf-1', { onInsert, onUpdate })
    );

    const thinRow = {
      id: 'order-2',
      order_number: 'RD-1002',
      status: 'preparing',
      storefront_id: 'sf-1',
      total: 30,
      created_at: new Date().toISOString(),
    };
    await capturedPayloadHandler!({ eventType: 'UPDATE', new: thinRow });
    expect(onUpdate).toHaveBeenCalledWith(thinRow);

    await new Promise((r) => setTimeout(r, 0));
    expect(onUpdate).toHaveBeenCalledWith(hydratedOrder);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onInsert).not.toHaveBeenCalled();
  });

  it('ignores a malformed payload and does not tear down the channel', async () => {
    const onInsert = jest.fn();
    const onUpdate = jest.fn();

    renderHook(() =>
      useStorefrontOrdersRealtime('sf-1', { onInsert, onUpdate })
    );

    // Malformed row - parseOrdersRealtimeRow returns null for it
    await capturedPayloadHandler!({ eventType: 'INSERT', new: { bad: true } });

    expect(onInsert).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    // Channel must stay alive - removeChannel not called during the event
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it('ignores an INSERT whose storefront_id does not match the hook storefrontId', async () => {
    const onInsert = jest.fn();

    renderHook(() =>
      useStorefrontOrdersRealtime('sf-1', {
        onInsert,
        onUpdate: jest.fn(),
      })
    );

    await capturedPayloadHandler!({
      eventType: 'INSERT',
      new: {
        id: 'order-x',
        order_number: 'RD-9999',
        status: 'pending',
        storefront_id: 'other-sf',  // wrong storefront
        total: 10,
        created_at: new Date().toISOString(),
      },
    });

    expect(onInsert).not.toHaveBeenCalled();
  });

  it('maps connection status correctly via onConnectionChange', () => {
    const onConnectionChange = jest.fn();

    renderHook(() =>
      useStorefrontOrdersRealtime('sf-1', {
        onInsert: jest.fn(),
        onUpdate: jest.fn(),
        onConnectionChange,
      })
    );

    capturedSubscribeCallback!('SUBSCRIBED');
    expect(onConnectionChange).toHaveBeenLastCalledWith('connected');

    capturedSubscribeCallback!('CHANNEL_ERROR');
    expect(onConnectionChange).toHaveBeenLastCalledWith('disconnected');

    capturedSubscribeCallback!('TIMED_OUT');
    expect(onConnectionChange).toHaveBeenLastCalledWith('disconnected');

    capturedSubscribeCallback!('CLOSED');
    expect(onConnectionChange).toHaveBeenLastCalledWith('disconnected');

    capturedSubscribeCallback!('SUBSCRIBING');
    expect(onConnectionChange).toHaveBeenLastCalledWith('connecting');
  });

  it('calls removeChannel on unmount', () => {
    const { unmount } = renderHook(() =>
      useStorefrontOrdersRealtime('sf-1', {
        onInsert: jest.fn(),
        onUpdate: jest.fn(),
      })
    );

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('does nothing when storefrontId is null', () => {
    renderHook(() =>
      useStorefrontOrdersRealtime(null, {
        onInsert: jest.fn(),
        onUpdate: jest.fn(),
      })
    );

    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });
});
