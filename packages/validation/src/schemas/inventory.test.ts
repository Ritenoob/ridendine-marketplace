// ==========================================
// INVENTORY SCHEMA TESTS (Stage 7)
// ==========================================

import { describe, expect, it } from 'vitest';
import {
  createInventoryItemSchema,
  inventoryMovementSchema,
  inventoryWasteSchema,
  inventoryCountSchema,
} from './inventory';

const UUID = '55555555-5555-4555-8555-555555555555';

describe('createInventoryItemSchema', () => {
  it('accepts a minimal item with defaults', () => {
    const r = createInventoryItemSchema.safeParse({ name: 'Rice' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unit).toBe('unit');
      expect(r.data.initialQuantity).toBe(0);
      expect(r.data.costPerUnit).toBe(0);
    }
  });

  it('rejects an empty name', () => {
    expect(createInventoryItemSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('inventoryMovementSchema', () => {
  it('requires magnitude for directional types', () => {
    expect(inventoryMovementSchema.safeParse({ movementType: 'receive', magnitude: 10 }).success).toBe(true);
    expect(inventoryMovementSchema.safeParse({ movementType: 'receive' }).success).toBe(false);
  });

  it('requires signedQuantity for adjustment/correction/transfer', () => {
    expect(inventoryMovementSchema.safeParse({ movementType: 'adjustment', signedQuantity: -3 }).success).toBe(true);
    expect(inventoryMovementSchema.safeParse({ movementType: 'adjustment', magnitude: 3 }).success).toBe(false);
  });

  it('rejects a negative magnitude', () => {
    expect(inventoryMovementSchema.safeParse({ movementType: 'receive', magnitude: -1 }).success).toBe(false);
  });
});

describe('inventoryWasteSchema', () => {
  it('requires a positive quantity and an item id', () => {
    expect(inventoryWasteSchema.safeParse({ inventoryItemId: UUID, quantity: 2 }).success).toBe(true);
    expect(inventoryWasteSchema.safeParse({ inventoryItemId: UUID, quantity: 0 }).success).toBe(false);
    expect(inventoryWasteSchema.safeParse({ quantity: 2 }).success).toBe(false);
  });
});

describe('inventoryCountSchema', () => {
  it('requires at least one line', () => {
    expect(inventoryCountSchema.safeParse({ lines: [] }).success).toBe(false);
    expect(
      inventoryCountSchema.safeParse({ lines: [{ inventoryItemId: UUID, countedQuantity: 5 }] }).success
    ).toBe(true);
  });
});
