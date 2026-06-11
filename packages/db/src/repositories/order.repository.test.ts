import { describe, expect, it, vi } from 'vitest';
import {
  InvalidOrderTransitionError,
  OrderTransitionConflictError,
  updateOrderStatus,
} from './order.repository';
import type { SupabaseClient } from '../client/types';

// ==========================================
// MOCK SUPABASE CLIENT
// ==========================================

interface UpdateCall {
  payload: Record<string, unknown>;
  filters: Array<[string, unknown]>;
}

function makeClient(opts: {
  currentStatus: string;
  updateResult?: unknown[];
  updateError?: { message: string } | null;
}) {
  const updateCalls: UpdateCall[] = [];

  const client = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { status: opts.currentStatus }, error: null }),
        }),
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        const call: UpdateCall = { payload, filters: [] };
        updateCalls.push(call);
        interface UpdateChain {
          eq: (column: string, value: unknown) => UpdateChain;
          select: () => Promise<{ data: unknown[]; error: { message: string } | null }>;
        }
        const chain: UpdateChain = {
          eq: (column: string, value: unknown) => {
            call.filters.push([column, value]);
            return chain;
          },
          select: () =>
            Promise.resolve({
              data: opts.updateResult ?? [],
              error: opts.updateError ?? null,
            }),
        };
        return chain;
      }),
    })),
  };

  return { client: client as unknown as SupabaseClient, updateCalls };
}

// ==========================================
// TESTS
// ==========================================

describe('updateOrderStatus', () => {
  it('applies a valid transition and filters the UPDATE on the validated status', async () => {
    const updatedRow = { id: 'o-1', status: 'accepted' };
    const { client, updateCalls } = makeClient({
      currentStatus: 'pending',
      updateResult: [updatedRow],
    });

    const result = await updateOrderStatus(client, 'o-1', 'accepted');

    expect(result).toEqual(updatedRow);
    expect(updateCalls.length).toBe(1);
    // Optimistic concurrency: UPDATE must be conditional on BOTH id and the
    // status we validated against — not just the id.
    expect(updateCalls[0]!.filters).toContainEqual(['id', 'o-1']);
    expect(updateCalls[0]!.filters).toContainEqual(['status', 'pending']);
  });

  it('throws InvalidOrderTransitionError for a disallowed transition', async () => {
    const { client } = makeClient({ currentStatus: 'delivered' });

    await expect(updateOrderStatus(client, 'o-1', 'preparing')).rejects.toBeInstanceOf(
      InvalidOrderTransitionError
    );
  });

  it('throws OrderTransitionConflictError when the status changed concurrently (0 rows updated)', async () => {
    // Validation read sees 'pending', but another writer transitions the order
    // before our UPDATE lands — the conditional UPDATE affects 0 rows.
    const { client } = makeClient({ currentStatus: 'pending', updateResult: [] });

    await expect(updateOrderStatus(client, 'o-1', 'accepted')).rejects.toBeInstanceOf(
      OrderTransitionConflictError
    );
  });

  it('sets actual_ready_at when transitioning to ready_for_pickup', async () => {
    const updatedRow = { id: 'o-2', status: 'ready_for_pickup' };
    const { client, updateCalls } = makeClient({
      currentStatus: 'preparing',
      updateResult: [updatedRow],
    });

    await updateOrderStatus(client, 'o-2', 'ready_for_pickup');

    expect(updateCalls[0]!.payload.actual_ready_at).toBeDefined();
  });
});
