import { describe, expect, it, vi } from 'vitest';
import { createReconciliationService, ReconciliationService } from './reconciliation.service';
import type { ActorContext } from '@ridendine/types';

type EventRow = {
  stripe_event_id: string;
  related_order_id: string | null;
  related_payment_id: string | null;
  event_type: string;
  processed_at: string;
  stripe_amount_cents?: number | null;
};

type ReconClientOptions = {
  events?: EventRow[] | null;
  eventsError?: { message: string } | null;
  /** ledger_entries rows keyed by stripe_id */
  ledgerByStripeId?: Record<string, { id: string }[]>;
  /** ledger_entries rows keyed by order_id (entry_type filtered lookup) */
  ledgerByOrderId?: Record<string, { id: string }[]>;
  /** amount_cents keyed by ledger entry id (for the `.in('id', ids)` sum query) */
  ledgerAmountsById?: Record<string, number>;
  /** customer_charge_capture row keyed by order_id (fallback path) */
  captureByOrderId?: Record<string, { amount_cents: number } | null>;
  upsertError?: { message: string } | null;
};

function buildClient(opts: ReconClientOptions) {
  const upserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ patch: Record<string, unknown>; eqArgs: unknown[] }> = [];

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'stripe_events_processed') {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({
                data: opts.eventsError ? null : opts.events ?? [],
                error: opts.eventsError ?? null,
              }),
            }),
          }),
        };
      }

      if (table === 'ledger_entries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn((col: string, val: string) => {
              if (col === 'stripe_id') {
                return Promise.resolve({ data: opts.ledgerByStripeId?.[val] ?? [], error: null });
              }
              if (col === 'order_id') {
                return {
                  in: vi.fn().mockResolvedValue({
                    data: opts.ledgerByOrderId?.[val] ?? [],
                    error: null,
                  }),
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: opts.captureByOrderId?.[val] ?? null,
                      error: null,
                    }),
                  }),
                };
              }
              return Promise.resolve({ data: [], error: null });
            }),
            in: vi.fn((_col: string, ids: string[]) =>
              Promise.resolve({
                data: ids.map((id) => ({ amount_cents: opts.ledgerAmountsById?.[id] ?? 0 })),
                error: null,
              })
            ),
          }),
        };
      }

      if (table === 'stripe_reconciliation') {
        return {
          upsert: vi.fn(async (row: Record<string, unknown>) => {
            upserts.push(row);
            return { error: opts.upsertError ?? null };
          }),
          update: vi.fn((patch: Record<string, unknown>) => ({
            eq: vi.fn(async (...eqArgs: unknown[]) => {
              updates.push({ patch, eqArgs });
              return { error: opts.upsertError ?? null };
            }),
          })),
        };
      }

      return {};
    }),
  };

  return { client: client as never, upserts, updates };
}

const actor: ActorContext = { userId: 'ops-user-1', role: 'admin' as ActorContext['role'] };

describe('ReconciliationService.runDaily', () => {
  it('returns a zero summary when the events query errors', async () => {
    const { client, upserts } = buildClient({ eventsError: { message: 'boom' } });
    const svc = createReconciliationService(client);

    const summary = await svc.runDaily('2026-05-02T12:34:56Z');

    expect(summary).toEqual({ date: '2026-05-02', examined: 0, matched: 0, unmatched: 0, disputed: 0 });
    expect(upserts).toHaveLength(0);
  });

  it('returns a zero summary for a day with no events', async () => {
    const { client } = buildClient({ events: [] });
    const svc = createReconciliationService(client);

    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toEqual({ date: '2026-05-02', examined: 0, matched: 0, unmatched: 0, disputed: 0 });
  });

  it('upserts unmatched with variance 1 when no ledger rows match', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_unmatched',
          related_order_id: null,
          related_payment_id: 'pi_missing',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
        },
      ],
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ examined: 1, matched: 0, unmatched: 1, disputed: 0 });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      stripe_event_id: 'evt_unmatched',
      status: 'unmatched',
      variance_cents: 1,
      ledger_entry_ids: [],
    });
    expect(upserts[0]!.notes).toContain('No ledger match');
  });

  it('marks matched with zero variance when Stripe amount equals ledger sum (lookup by payment id)', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_match',
          related_order_id: null,
          related_payment_id: 'pi_1',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 5000,
        },
      ],
      ledgerByStripeId: { pi_1: [{ id: 'led-1' }, { id: 'led-2' }] },
      ledgerAmountsById: { 'led-1': 3000, 'led-2': -2000 }, // abs sum = 5000
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ examined: 1, matched: 1, unmatched: 0, disputed: 0 });
    expect(upserts[0]).toMatchObject({
      stripe_event_id: 'evt_match',
      status: 'matched',
      variance_cents: 0,
      variance_flagged: false,
      ledger_entry_ids: ['led-1', 'led-2'],
      notes: null,
    });
  });

  it('falls back to order-id lookup when no rows match the payment id', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_order_fallback',
          related_order_id: 'order-1',
          related_payment_id: 'pi_unknown',
          event_type: 'charge.refunded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 2500,
        },
      ],
      ledgerByStripeId: {},
      ledgerByOrderId: { 'order-1': [{ id: 'led-refund' }] },
      ledgerAmountsById: { 'led-refund': -2500 },
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ matched: 1, unmatched: 0, disputed: 0 });
    expect(upserts[0]).toMatchObject({ status: 'matched', ledger_entry_ids: ['led-refund'] });
  });

  it('marks disputed without flag when variance is below the 100c threshold', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_small_variance',
          related_order_id: null,
          related_payment_id: 'pi_1',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 5000,
        },
      ],
      ledgerByStripeId: { pi_1: [{ id: 'led-1' }] },
      ledgerAmountsById: { 'led-1': 4950 }, // Δ50c
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ matched: 0, unmatched: 0, disputed: 1 });
    expect(upserts[0]).toMatchObject({
      status: 'disputed',
      variance_cents: 50,
      variance_flagged: false,
    });
    expect(upserts[0]!.notes).toContain('Δ50c');
  });

  it('flags disputed rows when variance reaches the 100c threshold', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_big_variance',
          related_order_id: null,
          related_payment_id: 'pi_1',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 5000,
        },
      ],
      ledgerByStripeId: { pi_1: [{ id: 'led-1' }] },
      ledgerAmountsById: { 'led-1': 4900 }, // Δ100c
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ disputed: 1 });
    expect(upserts[0]).toMatchObject({
      status: 'disputed',
      variance_cents: 100,
      variance_flagged: true,
    });
  });

  it('marks unmatched when Stripe recorded an amount but linked ledger rows sum to zero', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_zero_ledger',
          related_order_id: null,
          related_payment_id: 'pi_1',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 5000,
        },
      ],
      ledgerByStripeId: { pi_1: [{ id: 'led-1' }] },
      ledgerAmountsById: { 'led-1': 0 },
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ matched: 0, unmatched: 1, disputed: 0 });
    expect(upserts[0]).toMatchObject({ status: 'unmatched', variance_cents: 5000 });
  });

  it('records a presence-only match with explanatory note when the Stripe snapshot is missing', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_no_snapshot',
          related_order_id: null,
          related_payment_id: 'pi_1',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: null,
        },
      ],
      ledgerByStripeId: { pi_1: [{ id: 'led-1' }] },
      ledgerAmountsById: { 'led-1': 4200 },
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ matched: 1, unmatched: 0, disputed: 0 });
    expect(upserts[0]).toMatchObject({ status: 'matched', variance_cents: 0 });
    expect(upserts[0]!.notes).toContain('amount parity not verified');
  });

  it('uses the charge-capture fallback amount when no ledger ids link directly', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_capture_fallback',
          related_order_id: 'order-9',
          related_payment_id: null,
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 7500,
        },
      ],
      ledgerByOrderId: { 'order-9': [] },
      captureByOrderId: { 'order-9': { amount_cents: 7500 } },
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toMatchObject({ matched: 1, unmatched: 0, disputed: 0 });
    expect(upserts[0]).toMatchObject({
      status: 'matched',
      variance_cents: 0,
      ledger_entry_ids: [],
    });
  });

  it('counts an event as disputed when the reconciliation upsert fails', async () => {
    const { client } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_upsert_fail',
          related_order_id: null,
          related_payment_id: 'pi_1',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T15:00:00.000Z',
          stripe_amount_cents: 5000,
        },
      ],
      ledgerByStripeId: { pi_1: [{ id: 'led-1' }] },
      ledgerAmountsById: { 'led-1': 5000 },
      upsertError: { message: 'insert denied' },
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    // Documents current behavior: the event is counted both as matched (amount
    // parity held) and disputed (persistence failed), so matched + unmatched +
    // disputed can exceed examined.
    expect(summary).toMatchObject({ examined: 1, matched: 1, disputed: 1 });
  });

  it('aggregates a mixed day of matched, unmatched, and disputed events', async () => {
    const { client, upserts } = buildClient({
      events: [
        {
          stripe_event_id: 'evt_a',
          related_order_id: null,
          related_payment_id: 'pi_a',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T10:00:00.000Z',
          stripe_amount_cents: 1000,
        },
        {
          stripe_event_id: 'evt_b',
          related_order_id: null,
          related_payment_id: 'pi_b',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T11:00:00.000Z',
          stripe_amount_cents: 2000,
        },
        {
          stripe_event_id: 'evt_c',
          related_order_id: null,
          related_payment_id: 'pi_c',
          event_type: 'payment_intent.succeeded',
          processed_at: '2026-05-02T12:00:00.000Z',
        },
      ],
      ledgerByStripeId: { pi_a: [{ id: 'led-a' }], pi_b: [{ id: 'led-b' }], pi_c: [] },
      ledgerAmountsById: { 'led-a': 1000, 'led-b': 1500 },
    });

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');

    expect(summary).toEqual({
      date: '2026-05-02',
      examined: 3,
      matched: 1,
      unmatched: 1,
      disputed: 1,
    });
    expect(upserts).toHaveLength(3);
  });
});

describe('ReconciliationService.resolveManual', () => {
  it('updates the row to manual_resolved, clears variance, and tags the resolver', async () => {
    const { client, updates } = buildClient({});
    const svc = new ReconciliationService(client);

    const result = await svc.resolveManual({
      reconId: 'recon-1',
      actor,
      notes: 'Verified against Stripe dashboard',
    });

    expect(result).toEqual({ ok: true });
    expect(updates).toHaveLength(1);
    expect(updates[0]!.eqArgs).toEqual(['id', 'recon-1']);
    expect(updates[0]!.patch).toMatchObject({
      status: 'manual_resolved',
      variance_cents: 0,
      variance_flagged: false,
    });
    expect(updates[0]!.patch.notes).toContain('Verified against Stripe dashboard');
    expect(updates[0]!.patch.notes).toContain('resolved_by_user=ops-user-1');
    expect(updates[0]!.patch).not.toHaveProperty('ledger_entry_ids');
  });

  it('attaches ledger entry ids when provided', async () => {
    const { client, updates } = buildClient({});
    const svc = new ReconciliationService(client);

    const result = await svc.resolveManual({
      reconId: 'recon-2',
      actor,
      notes: 'Linked manually',
      ledgerEntryIds: ['led-1', 'led-2'],
    });

    expect(result).toEqual({ ok: true });
    expect(updates[0]!.patch.ledger_entry_ids).toEqual(['led-1', 'led-2']);
  });

  it('returns ok false with the error message when the update fails', async () => {
    const { client } = buildClient({ upsertError: { message: 'row not found' } });
    const svc = new ReconciliationService(client);

    const result = await svc.resolveManual({
      reconId: 'recon-missing',
      actor,
      notes: 'attempt',
    });

    expect(result).toEqual({ ok: false, error: 'row not found' });
  });
});
