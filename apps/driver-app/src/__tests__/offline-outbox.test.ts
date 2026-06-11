/**
 * @jest-environment node
 */
import {
  OfflineOutbox,
  isOfflineApiError,
  type OutboxEntry,
  type OutboxStore,
} from '@/lib/offline-outbox';

const OFFLINE_BODY = { error: 'You appear to be offline. Reconnect and try again.' };

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

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function statusRequest(status: string) {
  return {
    url: '/api/deliveries/del-1',
    method: 'PATCH',
    body: JSON.stringify({ status }),
  };
}

describe('isOfflineApiError', () => {
  it('detects the service worker offline 503 fallback', () => {
    expect(isOfflineApiError(503, OFFLINE_BODY)).toBe(true);
  });

  it('does not flag real server errors or non-503 statuses', () => {
    expect(isOfflineApiError(503, { error: 'Database unavailable' })).toBe(false);
    expect(isOfflineApiError(400, OFFLINE_BODY)).toBe(false);
    expect(isOfflineApiError(503, null)).toBe(false);
    expect(isOfflineApiError(503, 'offline')).toBe(false);
  });
});

describe('OfflineOutbox', () => {
  it('enqueues entries with FIFO ordering and filters them per delivery', async () => {
    const store = createMemoryStore();
    const outbox = new OfflineOutbox(store, jest.fn());

    const first = await outbox.enqueue({
      kind: 'status',
      deliveryId: 'del-1',
      request: statusRequest('en_route_to_pickup'),
    });
    const second = await outbox.enqueue({
      kind: 'issue',
      deliveryId: 'del-2',
      request: { url: '/api/deliveries/del-2/issue', method: 'POST', body: '{}' },
    });

    expect(second.seq).toBeGreaterThan(first.seq);
    expect(first.id).not.toBe(second.id);
    expect(await outbox.entriesFor('del-1')).toHaveLength(1);
    expect(await outbox.entriesFor('del-2')).toHaveLength(1);
  });

  it('replays entries in FIFO order and removes them on 2xx', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => jsonResponse(200, { success: true }));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({
      kind: 'status',
      deliveryId: 'del-1',
      request: statusRequest('en_route_to_pickup'),
    });
    await outbox.enqueue({
      kind: 'status',
      deliveryId: 'del-1',
      request: statusRequest('arrived_at_pickup'),
    });

    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(2);
    expect(result.dropped).toHaveLength(0);
    expect(result.remaining).toBe(0);
    expect(store.rows).toHaveLength(0);
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      '/api/deliveries/del-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'en_route_to_pickup' }) })
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      '/api/deliveries/del-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'arrived_at_pickup' }) })
    );
  });

  it('keeps every entry when fetch rejects (still offline)', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('b') });

    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(0);
    expect(result.remaining).toBe(2);
    expect(store.rows).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(1); // halted on the first failure
  });

  it('treats the service worker offline 503 as still-offline and keeps entries', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => jsonResponse(503, OFFLINE_BODY));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('b') });

    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(0);
    expect(result.dropped).toHaveLength(0);
    expect(result.remaining).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('drops 4xx-rejected entries, surfaces the server message, and keeps replaying', async () => {
    const store = createMemoryStore();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(409, { error: 'Invalid status transition' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('b') });

    const result = await outbox.replay();

    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]?.message).toBe('Invalid status transition');
    expect(result.replayed).toHaveLength(1);
    expect(result.remaining).toBe(0);
    expect(store.rows).toHaveLength(0);
  });

  it('extracts nested error messages from { error: { message } } bodies', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () =>
      jsonResponse(400, { success: false, error: { code: 'INVALID', message: 'Transition rejected' } })
    );
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    const result = await outbox.replay();

    expect(result.dropped[0]?.message).toBe('Transition rejected');
  });

  it('keeps entries and halts on a genuine 5xx server error', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => jsonResponse(500, { error: 'Internal server error' }));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('b') });

    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(0);
    expect(result.dropped).toHaveLength(0);
    expect(result.remaining).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(1); // FIFO order preserved, retried next pass
  });

  it('serializes concurrent replays so an entry is never replayed twice at once', async () => {
    const store = createMemoryStore();
    let active = 0;
    let maxActive = 0;
    const fetchFn = jest.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return jsonResponse(200, { success: true });
    });
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('b') });
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('c') });

    const [first, second] = await Promise.all([outbox.replay(), outbox.replay()]);

    expect(maxActive).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(3); // second pass found an empty queue
    expect(first.replayed.length + second.replayed.length).toBe(3);
    expect(store.rows).toHaveLength(0);
  });
});
