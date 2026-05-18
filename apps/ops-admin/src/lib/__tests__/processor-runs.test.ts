/**
 * @jest-environment node
 */

import { claimProcessorRun, processorIdempotencyKey } from '../processor-runs';

function buildHeaders(map: Record<string, string> = {}): Headers {
  return {
    get: (key: string) => map[key.toLowerCase()] ?? null,
  } as unknown as Headers;
}

function buildInsertClient(insertResult: { data?: { id: string } | null; error?: { code?: string; message?: string } | null }) {
  return {
    from: (_table: string) => ({
      insert: () => ({
        select: () => ({
          single: async () => insertResult,
        }),
      }),
    }),
  };
}

describe('processorIdempotencyKey', () => {
  it('prefers a supplied x-idempotency-key header when long enough', () => {
    const key = processorIdempotencyKey(buildHeaders({ 'x-idempotency-key': 'supplied-key-1234' }), 'sla');
    expect(key).toBe('supplied-key-1234');
  });

  it('falls back to processor:minute when no header is supplied', () => {
    const key = processorIdempotencyKey(buildHeaders(), 'sla');
    expect(key).toMatch(/^sla:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('ignores short supplied keys and falls back to the per-minute default', () => {
    const key = processorIdempotencyKey(buildHeaders({ 'x-idempotency-key': 'short' }), 'expired-offers');
    expect(key).toMatch(/^expired-offers:/);
  });
});

describe('claimProcessorRun', () => {
  it('claims a run on the first call', async () => {
    const client = buildInsertClient({ data: { id: 'run-1' }, error: null });

    const result = await claimProcessorRun(client, 'sla', buildHeaders({ 'x-idempotency-key': 'sla-minute-1' }));

    expect(result).toEqual({
      claimed: true,
      runId: 'run-1',
      idempotencyKey: 'sla-minute-1',
    });
  });

  it('returns claimed=false without error when the same key is reused (23505)', async () => {
    const client = buildInsertClient({ data: null, error: { code: '23505', message: 'duplicate key' } });

    const result = await claimProcessorRun(client, 'sla', buildHeaders({ 'x-idempotency-key': 'sla-minute-1' }));

    expect(result.claimed).toBe(false);
    expect(result.idempotencyKey).toBe('sla-minute-1');
    expect(result.error).toBeUndefined();
  });

  it('surfaces other database errors so the caller can return 500', async () => {
    const client = buildInsertClient({ data: null, error: { code: 'XX000', message: 'boom' } });

    const result = await claimProcessorRun(client, 'expired-offers', buildHeaders({ 'x-idempotency-key': 'expired-offers-minute-1' }));

    expect(result.claimed).toBe(false);
    expect(result.error).toBe('boom');
  });
});
