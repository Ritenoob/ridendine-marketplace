import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../client/types';
import {
  insertPartnerWebhookDeliveries,
  listDuePartnerWebhookDeliveries,
  listExistingPartnerWebhookDomainEventIds,
  listPartnerWebhookStatusEvents,
  updatePartnerWebhookDelivery,
} from './partner.repository';

function makeClient(results: Record<string, unknown>) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];

  function builder(table: string) {
    const chain: any = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'select', args });
        return chain;
      }),
      in: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'in', args });
        return chain;
      }),
      gte: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'gte', args });
        return chain;
      }),
      lte: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'lte', args });
        return chain;
      }),
      order: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'order', args });
        return chain;
      }),
      limit: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'limit', args });
        return chain;
      }),
      update: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'update', args });
        return chain;
      }),
      insert: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'insert', args });
        return chain;
      }),
      eq: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: 'eq', args });
        return chain;
      }),
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: results[table] ?? null, error: null }),
    };
    return chain;
  }

  const client = { from: vi.fn((table: string) => builder(table)) };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('partner webhook repository helpers', () => {
  it('lists deliverable status events inside the enqueue window', async () => {
    const { client, calls } = makeClient({
      order_status_history: [
        { id: 'ev-1', order_id: 'order-1', new_status: 'ready_for_pickup', created_at: '2026-06-30T00:00:00Z' },
      ],
    });

    const rows = await listPartnerWebhookStatusEvents(
      client,
      ['ready_for_pickup'],
      '2026-06-29T00:00:00Z',
      1000
    );

    expect(rows).toHaveLength(1);
    expect(calls).toContainEqual({
      table: 'order_status_history',
      op: 'in',
      args: ['new_status', ['ready_for_pickup']],
    });
    expect(calls).toContainEqual({
      table: 'order_status_history',
      op: 'gte',
      args: ['created_at', '2026-06-29T00:00:00Z'],
    });
  });

  it('returns existing delivery domain event ids', async () => {
    const { client } = makeClient({
      partner_webhook_deliveries: [{ domain_event_id: 'ev-1' }, { domain_event_id: 'ev-2' }],
    });

    await expect(
      listExistingPartnerWebhookDomainEventIds(client, ['ev-1', 'ev-2'])
    ).resolves.toEqual(['ev-1', 'ev-2']);
  });

  it('lists due deliveries with joined partner webhook credentials', async () => {
    const { client, calls } = makeClient({
      partner_webhook_deliveries: [
        {
          id: 'delivery-1',
          event_type: 'order.ready',
          payload: {},
          attempts: 0,
          max_attempts: 6,
          api_partners: { webhook_url: 'https://partner.test/hook', webhook_secret: 'secret' },
        },
      ],
    });

    const rows = await listDuePartnerWebhookDeliveries(client, '2026-06-30T00:00:00Z', 100);

    expect(rows[0]?.api_partners.webhook_url).toBe('https://partner.test/hook');
    expect(calls).toContainEqual({
      table: 'partner_webhook_deliveries',
      op: 'in',
      args: ['status', ['pending', 'failed']],
    });
    expect(calls).toContainEqual({
      table: 'partner_webhook_deliveries',
      op: 'lte',
      args: ['next_attempt_at', '2026-06-30T00:00:00Z'],
    });
  });

  it('inserts and updates webhook delivery rows through the repository boundary', async () => {
    const { client, calls } = makeClient({});

    await insertPartnerWebhookDeliveries(client, [
      {
        partner_id: 'partner-1',
        order_id: 'order-1',
        domain_event_id: 'event-1',
        event_type: 'order.ready',
        payload: { event: 'order.ready' },
        status: 'pending',
        next_attempt_at: '2026-06-30T00:00:00Z',
      },
    ]);
    await updatePartnerWebhookDelivery(client, 'delivery-1', {
      status: 'delivered',
      attempts: 1,
      response_code: 200,
      last_error: null,
      delivered_at: '2026-06-30T00:01:00Z',
    });

    expect(calls.find((call) => call.op === 'insert')?.table).toBe('partner_webhook_deliveries');
    expect(calls).toContainEqual({
      table: 'partner_webhook_deliveries',
      op: 'eq',
      args: ['id', 'delivery-1'],
    });
  });
});
