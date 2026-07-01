import { describe, expect, it } from 'vitest';
import {
  costPerBaseUnit,
  receivedBaseQuantity,
  purchaseOrderTotal,
  blendedUnitCost,
} from './purchasing.engine';

describe('purchasing.engine', () => {
  it('converts pack cost to per-base-unit cost', () => {
    expect(costPerBaseUnit(24, 12)).toBe(2); // $24 case of 12 -> $2/unit
    expect(costPerBaseUnit(5, 0)).toBe(5); // no pack size -> pack is the unit
  });

  it('converts packs to base units', () => {
    expect(receivedBaseQuantity(3, 12)).toBe(36);
    expect(receivedBaseQuantity(3, 0)).toBe(3); // treat as 1 base unit per pack
  });

  it('totals a purchase order', () => {
    expect(
      purchaseOrderTotal([
        { quantity: 2, unitCost: 24 },
        { quantity: 1, unitCost: 10 },
      ])
    ).toBe(58);
    expect(purchaseOrderTotal([])).toBe(0);
  });

  describe('blendedUnitCost', () => {
    it('weights new stock against existing on-hand', () => {
      // 10 @ $2 + 10 @ $4 -> $3
      expect(blendedUnitCost(10, 2, 10, 4)).toBeCloseTo(3, 5);
    });
    it('uses received cost when there is no existing stock', () => {
      expect(blendedUnitCost(0, 0, 5, 4)).toBe(4);
    });
    it('keeps current cost when nothing is received', () => {
      expect(blendedUnitCost(5, 3, 0, 0)).toBe(3);
    });
    it('never returns NaN when everything is zero', () => {
      expect(blendedUnitCost(0, 0, 0, 0)).toBe(0);
    });
  });
});
