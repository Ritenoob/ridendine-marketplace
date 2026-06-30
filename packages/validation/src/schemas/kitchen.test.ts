// ==========================================
// KITCHEN SCHEMA TESTS (Stage 5)
// ==========================================

import { describe, expect, it } from 'vitest';
import {
  updateKitchenTicketSchema,
  kitchenStationSchema,
  packChecklistSchema,
} from './kitchen';

const UUID = '33333333-3333-4333-8333-333333333333';

describe('updateKitchenTicketSchema', () => {
  it('accepts a plain status move', () => {
    const r = updateKitchenTicketSchema.safeParse({ toStatus: 'preparing' });
    expect(r.success).toBe(true);
  });

  it('requires problemReason when flagging a problem', () => {
    expect(updateKitchenTicketSchema.safeParse({ toStatus: 'problem' }).success).toBe(false);
    expect(
      updateKitchenTicketSchema.safeParse({ toStatus: 'problem', problemReason: 'ran out of rice' })
        .success
    ).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(updateKitchenTicketSchema.safeParse({ toStatus: 'ready_for_pickup' }).success).toBe(false);
  });

  it('accepts an optional station id but rejects a non-uuid', () => {
    expect(updateKitchenTicketSchema.safeParse({ toStatus: 'preparing', stationId: UUID }).success).toBe(true);
    expect(updateKitchenTicketSchema.safeParse({ toStatus: 'preparing', stationId: 'nope' }).success).toBe(false);
  });
});

describe('kitchenStationSchema', () => {
  it('defaults sortOrder and isActive', () => {
    const r = kitchenStationSchema.safeParse({ name: 'Grill' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sortOrder).toBe(0);
      expect(r.data.isActive).toBe(true);
    }
  });

  it('rejects an empty name', () => {
    expect(kitchenStationSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('packChecklistSchema', () => {
  it('applies sane defaults', () => {
    const r = packChecklistSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.bagCount).toBe(1);
      expect(r.data.sealed).toBe(false);
      expect(r.data.checkedItems).toEqual([]);
    }
  });

  it('rejects a zero bag count and a bad photo url', () => {
    expect(packChecklistSchema.safeParse({ bagCount: 0 }).success).toBe(false);
    expect(packChecklistSchema.safeParse({ photoUrl: 'not-a-url' }).success).toBe(false);
  });
});
