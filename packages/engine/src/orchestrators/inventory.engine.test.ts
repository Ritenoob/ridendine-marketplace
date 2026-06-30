import { describe, expect, it } from 'vitest';
import {
  signedMovementQuantity,
  computeOnHand,
  computeStockStatus,
  computeReorderSuggestion,
  ordersRemaining,
  computeInventoryAlerts,
} from './inventory.engine';

describe('inventory.engine', () => {
  it('signs movements by type', () => {
    expect(signedMovementQuantity('receive', 10)).toBe(10);
    expect(signedMovementQuantity('return', 4)).toBe(4);
    expect(signedMovementQuantity('waste', 3)).toBe(-3);
    expect(signedMovementQuantity('consume_order', 2)).toBe(-2);
    // magnitude is taken absolute for directional types
    expect(signedMovementQuantity('receive', -10)).toBe(10);
    expect(signedMovementQuantity('waste', -3)).toBe(-3);
    // signed types pass through
    expect(signedMovementQuantity('adjustment', -5)).toBe(-5);
    expect(signedMovementQuantity('count_correction', 7)).toBe(7);
  });

  it('computes on-hand as the sum of the ledger', () => {
    expect(computeOnHand([{ quantity: 10 }, { quantity: -3 }, { quantity: -2 }])).toBe(5);
    expect(computeOnHand([])).toBe(0);
  });

  it('classifies stock status', () => {
    expect(computeStockStatus({ onHand: 0 })).toBe('stockout');
    expect(computeStockStatus({ onHand: -1 })).toBe('stockout');
    expect(computeStockStatus({ onHand: 5, reorderPoint: 5 })).toBe('low');
    expect(computeStockStatus({ onHand: 6, reorderPoint: 5 })).toBe('ok');
    expect(computeStockStatus({ onHand: 6 })).toBe('ok'); // no reorder point
  });

  it('suggests reorder quantity back to par only when below reorder point', () => {
    expect(computeReorderSuggestion({ onHand: 2, reorderPoint: 3, parQuantity: 10 })).toBe(8);
    expect(computeReorderSuggestion({ onHand: 5, reorderPoint: 3, parQuantity: 10 })).toBe(0); // above reorder
    expect(computeReorderSuggestion({ onHand: 2, reorderPoint: 3, parQuantity: null })).toBe(0); // no par
  });

  it('computes orders remaining from per-order usage', () => {
    expect(ordersRemaining(10, 2)).toBe(5);
    expect(ordersRemaining(9, 2)).toBe(4); // floor
    expect(ordersRemaining(10, 0)).toBe(Infinity);
  });

  describe('computeInventoryAlerts', () => {
    const now = new Date('2026-06-30T12:00:00Z');

    it('raises stockout and low_stock alerts', () => {
      const alerts = computeInventoryAlerts(
        [
          { id: 'a', onHand: 0 },
          { id: 'b', onHand: 2, reorderPoint: 5 },
          { id: 'c', onHand: 99, reorderPoint: 5 },
        ],
        now
      );
      expect(alerts).toContainEqual({ inventoryItemId: 'a', alertType: 'stockout' });
      expect(alerts).toContainEqual({ inventoryItemId: 'b', alertType: 'low_stock' });
      expect(alerts.find((x) => x.inventoryItemId === 'c')).toBeUndefined();
    });

    it('raises expiry alerts independently of stock', () => {
      const alerts = computeInventoryAlerts(
        [
          { id: 'd', onHand: 50, expiryDate: '2026-06-29' }, // past -> expired
          { id: 'e', onHand: 50, expiryDate: '2026-07-01' }, // within 3 days -> expiring_soon
          { id: 'f', onHand: 50, expiryDate: '2026-07-20' }, // far -> none
        ],
        now
      );
      expect(alerts).toContainEqual({ inventoryItemId: 'd', alertType: 'expired' });
      expect(alerts).toContainEqual({ inventoryItemId: 'e', alertType: 'expiring_soon' });
      expect(alerts.find((x) => x.inventoryItemId === 'f')).toBeUndefined();
    });

    it('can raise both a stock and an expiry alert for one item', () => {
      const alerts = computeInventoryAlerts([{ id: 'g', onHand: 0, expiryDate: '2026-06-01' }], now);
      expect(alerts.filter((a) => a.inventoryItemId === 'g')).toHaveLength(2);
    });

    it('skips inactive items', () => {
      const alerts = computeInventoryAlerts([{ id: 'h', onHand: 0, isActive: false }], now);
      expect(alerts).toHaveLength(0);
    });
  });
});
