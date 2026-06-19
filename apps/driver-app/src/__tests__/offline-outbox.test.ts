/**
 * @jest-environment node
 */
import {
  OfflineOutbox,
  isOfflineApiError,
  type OutboxEntry,
  type OutboxStore,
  type PendingUpload,
} from '@/lib/offline-outbox';

const OFFLINE_BODY = { error: 'You appear to be offline. Reconnect and try again.' };

// Mirrors the IndexedDB store: all() returns fresh clones (structured clone),
// so in-place mutations are only visible after an explicit update().
function createMemoryStore(): OutboxStore & { rows: OutboxEntry[] } {
  let seq = 0;
  const rows: OutboxEntry[] = [];
  const clone = (entry: OutboxEntry) => JSON.parse(JSON.stringify(entry)) as OutboxEntry;
  return {
    rows,
    async add(entry) {
      const full = { ...entry, seq: (seq += 1) } as OutboxEntry;
      rows.push(full);
      return clone(full);
    },
    async all() {
      return [...rows].sort((a, b) => a.seq - b.seq).map(clone);
    },
    async remove(id) {
      const index = rows.findIndex((row) => row.id === id);
      if (index >= 0) rows.splice(index, 1);
    },
    async update(entry) {
      const index = rows.findIndex((row) => row.id === entry.id);
      if (index >= 0) rows[index] = clone(entry);
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

describe('OfflineOutbox proof entries with pending uploads', () => {
  const PROOF_DATA_URL = 'data:image/jpeg;base64,proof';
  const SIGNATURE_DATA_URL = 'data:image/png;base64,signature';
  const UPLOADED_URL = 'https://storage.example/delivery-photos/proof.jpg';

  const pendingProofUpload: PendingUpload = {
    field: 'proofUrl',
    dataUrl: PROOF_DATA_URL,
    context: 'pickup',
    deliveryId: 'del-1',
  };

  function proofInput(pendingUploads: PendingUpload[], body: Record<string, unknown> = {}) {
    return {
      kind: 'proof' as const,
      deliveryId: 'del-1',
      request: {
        url: '/api/deliveries/del-1/proof',
        method: 'POST',
        body: JSON.stringify({ eventType: 'pickup', ...body }),
      },
      pendingUploads,
    };
  }

  it('uploads pending photos first and submits the proof with the returned URL', async () => {
    const store = createMemoryStore();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, url: UPLOADED_URL, path: 'p', context: 'pickup' })
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue(proofInput([pendingProofUpload]));
    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(1);
    expect(result.uploadFallbacks).toHaveLength(0);
    expect(result.remaining).toBe(0);
    expect(store.rows).toHaveLength(0);
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dataUrl: PROOF_DATA_URL, context: 'pickup', deliveryId: 'del-1' }),
      })
    );
    const [proofUrlArg, proofInit] = fetchFn.mock.calls[1]!;
    expect(proofUrlArg).toBe('/api/deliveries/del-1/proof');
    expect(JSON.parse(proofInit.body)).toEqual({ eventType: 'pickup', proofUrl: UPLOADED_URL });
  });

  it('keeps the entry queued when the upload fails at the network level', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue(proofInput([pendingProofUpload]));
    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(0);
    expect(result.remaining).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1); // only the upload was attempted
    expect(store.rows[0]?.pendingUploads).toEqual([pendingProofUpload]);
    expect(JSON.parse(store.rows[0]!.request.body)).toEqual({ eventType: 'pickup' });
  });

  it('keeps the entry queued on the service worker offline 503 during upload', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => jsonResponse(503, OFFLINE_BODY));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue(proofInput([pendingProofUpload]));
    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(0);
    expect(result.remaining).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(store.rows[0]?.pendingUploads).toEqual([pendingProofUpload]);
  });

  it('keeps the entry queued on a genuine 5xx upload failure', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => jsonResponse(500, { error: 'Upload failed' }));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue(proofInput([pendingProofUpload]));
    const result = await outbox.replay();

    expect(result.remaining).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(store.rows[0]?.pendingUploads).toEqual([pendingProofUpload]);
  });

  it('falls back to submitting the data URL when the upload is rejected with a 4xx', async () => {
    const store = createMemoryStore();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(400, { error: 'File too large. Maximum 5MB' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue(proofInput([pendingProofUpload]));
    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(1);
    expect(result.uploadFallbacks).toHaveLength(1);
    expect(result.uploadFallbacks[0]?.message).toBe('File too large. Maximum 5MB');
    expect(result.remaining).toBe(0);
    const [, proofInit] = fetchFn.mock.calls[1]!;
    expect(JSON.parse(proofInit.body)).toEqual({ eventType: 'pickup', proofUrl: PROOF_DATA_URL });
  });

  it('persists upload progress so a completed upload is not repeated next pass', async () => {
    const store = createMemoryStore();
    const fetchFn = jest
      .fn()
      // First pass: proof photo uploads, then the signature upload dies.
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, url: UPLOADED_URL, path: 'p', context: 'dropoff' })
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      // Second pass: signature upload and proof submission succeed.
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          url: 'https://storage.example/delivery-photos/sig.png',
          path: 's',
          context: 'signature',
        })
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));
    const outbox = new OfflineOutbox(store, fetchFn);

    const pendingSignatureUpload: PendingUpload = {
      field: 'signatureUrl',
      dataUrl: SIGNATURE_DATA_URL,
      context: 'signature',
      deliveryId: 'del-1',
    };
    await outbox.enqueue({
      ...proofInput([
        { ...pendingProofUpload, context: 'dropoff' },
        pendingSignatureUpload,
      ]),
      request: {
        url: '/api/deliveries/del-1/proof',
        method: 'POST',
        body: JSON.stringify({ eventType: 'dropoff' }),
      },
    });

    const first = await outbox.replay();
    expect(first.remaining).toBe(1);
    // The completed upload was persisted: URL substituted, only the signature pending.
    expect(JSON.parse(store.rows[0]!.request.body)).toEqual({
      eventType: 'dropoff',
      proofUrl: UPLOADED_URL,
    });
    expect(store.rows[0]?.pendingUploads).toEqual([pendingSignatureUpload]);

    const second = await outbox.replay();
    expect(second.replayed).toHaveLength(1);
    expect(second.remaining).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(4); // proof upload was NOT repeated
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      '/api/upload',
      expect.objectContaining({
        body: JSON.stringify({
          dataUrl: SIGNATURE_DATA_URL,
          context: 'signature',
          deliveryId: 'del-1',
        }),
      })
    );
    const [, proofInit] = fetchFn.mock.calls[3]!;
    expect(JSON.parse(proofInit.body)).toEqual({
      eventType: 'dropoff',
      proofUrl: UPLOADED_URL,
      signatureUrl: 'https://storage.example/delivery-photos/sig.png',
    });
  });

  it('halts the pass on an upload failure so later entries keep FIFO order', async () => {
    const store = createMemoryStore();
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue(proofInput([pendingProofUpload]));
    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });

    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(0);
    expect(result.remaining).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(1); // halted on the failed upload
  });

  it('replays mixed entries in FIFO order, uploading proof photos in sequence', async () => {
    const store = createMemoryStore();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { success: true })) // status
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, url: UPLOADED_URL, path: 'p', context: 'pickup' })
      ) // upload
      .mockResolvedValueOnce(jsonResponse(200, { success: true })) // proof
      .mockResolvedValueOnce(jsonResponse(200, { success: true })); // issue
    const outbox = new OfflineOutbox(store, fetchFn);

    await outbox.enqueue({ kind: 'status', deliveryId: 'del-1', request: statusRequest('a') });
    await outbox.enqueue(proofInput([pendingProofUpload]));
    await outbox.enqueue({
      kind: 'issue',
      deliveryId: 'del-1',
      request: { url: '/api/deliveries/del-1/issue', method: 'POST', body: '{}' },
    });

    const result = await outbox.replay();

    expect(result.replayed).toHaveLength(3);
    expect(result.remaining).toBe(0);
    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      '/api/deliveries/del-1',
      '/api/upload',
      '/api/deliveries/del-1/proof',
      '/api/deliveries/del-1/issue',
    ]);
  });
});
