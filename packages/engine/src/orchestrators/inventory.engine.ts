// ==========================================
// INVENTORY ENGINE (Stage 7)
//
// Pure stock math. The movement ledger is the source of truth: on-hand is the
// sum of signed movement quantities. `inventory_items.current_quantity` is a
// cache the API keeps in step with the ledger. No DB access here so the rules
// are exhaustively unit-testable.
// ==========================================

export type MovementType =
  | 'receive'
  | 'consume_order'
  | 'consume_batch'
  | 'waste'
  | 'adjustment'
  | 'count_correction'
  | 'transfer'
  | 'return';

// Movement types that ADD stock when given a positive magnitude.
const ADDITIVE_TYPES = new Set<MovementType>(['receive', 'return']);
// Movement types that REMOVE stock when given a positive magnitude.
const SUBTRACTIVE_TYPES = new Set<MovementType>(['consume_order', 'consume_batch', 'waste']);
// These carry an explicit sign from the caller (a correction can go either way).
const SIGNED_TYPES = new Set<MovementType>(['adjustment', 'count_correction', 'transfer']);

/**
 * Normalize a movement into a signed delta applied to on-hand.
 * - receive / return: +|magnitude|
 * - consume_* / waste: -|magnitude|
 * - adjustment / count_correction / transfer: the caller's signed value as-is
 */
export function signedMovementQuantity(type: MovementType, magnitude: number): number {
  if (ADDITIVE_TYPES.has(type)) return Math.abs(magnitude);
  if (SUBTRACTIVE_TYPES.has(type)) return -Math.abs(magnitude);
  if (SIGNED_TYPES.has(type)) return magnitude;
  return magnitude;
}

export interface StockMovementRow {
  quantity: number; // already signed
}

/** On-hand quantity = sum of signed ledger movements. */
export function computeOnHand(movements: StockMovementRow[]): number {
  return movements.reduce((sum, m) => sum + Number(m.quantity ?? 0), 0);
}

export function applyMovementToQuantity(current: number, signedQuantity: number): number {
  return current + signedQuantity;
}

export type StockStatus = 'stockout' | 'low' | 'ok';

export interface InventoryItemStatusInput {
  onHand: number;
  reorderPoint?: number | null;
  parQuantity?: number | null;
}

export function computeStockStatus(item: InventoryItemStatusInput): StockStatus {
  if (item.onHand <= 0) return 'stockout';
  if (item.reorderPoint != null && item.onHand <= item.reorderPoint) return 'low';
  return 'ok';
}

/** Quantity to order to return to par; 0 when not below the reorder point. */
export function computeReorderSuggestion(item: InventoryItemStatusInput): number {
  const { onHand, reorderPoint, parQuantity } = item;
  const belowReorder = reorderPoint != null && onHand <= reorderPoint;
  if (!belowReorder || parQuantity == null) return 0;
  return Math.max(0, parQuantity - onHand);
}

/**
 * How many more orders/batches can be made given per-order usage.
 * Returns Infinity when usage is 0 (item not consumed per order).
 */
export function ordersRemaining(onHand: number, perOrderUsage: number): number {
  if (perOrderUsage <= 0) return Infinity;
  return Math.max(0, Math.floor(onHand / perOrderUsage));
}

export type InventoryAlertType = 'low_stock' | 'stockout' | 'expiring_soon' | 'expired';

export interface InventoryAlertItemInput {
  id: string;
  onHand: number;
  reorderPoint?: number | null;
  parQuantity?: number | null;
  expiryDate?: string | null;
  isActive?: boolean;
}

export interface InventoryAlert {
  inventoryItemId: string;
  alertType: InventoryAlertType;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derive the open alerts for a set of items. Stock and expiry are independent,
 * so an item can raise both a stock alert and an expiry alert.
 */
export function computeInventoryAlerts(
  items: InventoryAlertItemInput[],
  now: Date,
  opts: { expiringSoonDays?: number } = {}
): InventoryAlert[] {
  const expiringSoonDays = opts.expiringSoonDays ?? 3;
  const nowMs = now.getTime();
  const alerts: InventoryAlert[] = [];

  for (const item of items) {
    if (item.isActive === false) continue;

    const status = computeStockStatus(item);
    if (status === 'stockout') {
      alerts.push({ inventoryItemId: item.id, alertType: 'stockout' });
    } else if (status === 'low') {
      alerts.push({ inventoryItemId: item.id, alertType: 'low_stock' });
    }

    if (item.expiryDate) {
      const expMs = Date.parse(item.expiryDate);
      if (Number.isFinite(expMs)) {
        if (expMs < nowMs) {
          alerts.push({ inventoryItemId: item.id, alertType: 'expired' });
        } else if (expMs - nowMs <= expiringSoonDays * DAY_MS) {
          alerts.push({ inventoryItemId: item.id, alertType: 'expiring_soon' });
        }
      }
    }
  }

  return alerts;
}
