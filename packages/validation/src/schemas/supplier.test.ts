// ==========================================
// SUPPLIER & PURCHASING SCHEMA TESTS (Stage 8)
// ==========================================

import { describe, expect, it } from 'vitest';
import {
  createSupplierSchema,
  supplierItemSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
} from './supplier';

const UUID = '66666666-6666-4666-8666-666666666666';

describe('createSupplierSchema', () => {
  it('accepts a name-only supplier', () => {
    expect(createSupplierSchema.safeParse({ name: 'Sysco' }).success).toBe(true);
  });
  it('rejects an invalid email', () => {
    expect(createSupplierSchema.safeParse({ name: 'X', email: 'not-an-email' }).success).toBe(false);
  });
});

describe('supplierItemSchema', () => {
  it('defaults pack size and unit cost', () => {
    const r = supplierItemSchema.safeParse({ name: 'Case of tomatoes' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.packSize).toBe(1);
      expect(r.data.unitCost).toBe(0);
    }
  });
  it('rejects a non-positive pack size', () => {
    expect(supplierItemSchema.safeParse({ name: 'X', packSize: 0 }).success).toBe(false);
  });
});

describe('createPurchaseOrderSchema', () => {
  it('requires at least one line', () => {
    expect(createPurchaseOrderSchema.safeParse({ lines: [] }).success).toBe(false);
    expect(
      createPurchaseOrderSchema.safeParse({
        supplierId: UUID,
        lines: [{ quantity: 2, packSize: 12, unitCost: 24 }],
      }).success
    ).toBe(true);
  });
  it('rejects a non-positive line quantity', () => {
    expect(createPurchaseOrderSchema.safeParse({ lines: [{ quantity: 0 }] }).success).toBe(false);
  });
});

describe('receivePurchaseOrderSchema', () => {
  it('requires line receipts', () => {
    expect(receivePurchaseOrderSchema.safeParse({ lines: [] }).success).toBe(false);
    expect(
      receivePurchaseOrderSchema.safeParse({
        lines: [{ purchaseOrderLineId: UUID, receivedPacks: 2 }],
      }).success
    ).toBe(true);
  });
});
