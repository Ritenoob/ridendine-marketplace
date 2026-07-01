// ==========================================
// PURCHASING ENGINE (Stage 8)
//
// Pure purchasing / receiving math. Suppliers sell in PACKS (e.g. a case of 12);
// inventory is tracked in BASE UNITS. These helpers convert between the two and
// compute PO totals and the blended unit cost when receiving into existing
// stock. No DB access, so the rules are exhaustively unit-testable.
// ==========================================

/** Cost of one base unit given a per-pack cost and pack size. */
export function costPerBaseUnit(packCost: number, packSize: number): number {
  if (packSize <= 0) return packCost;
  return packCost / packSize;
}

/** Base units received from a number of packs. */
export function receivedBaseQuantity(packs: number, packSize: number): number {
  return packs * (packSize > 0 ? packSize : 1);
}

export interface PurchaseOrderLineInput {
  quantity: number; // packs
  unitCost: number; // per pack
}

/** Total cost of a purchase order = Σ packs × per-pack cost. */
export function purchaseOrderTotal(lines: PurchaseOrderLineInput[]): number {
  return lines.reduce((sum, l) => sum + Number(l.quantity ?? 0) * Number(l.unitCost ?? 0), 0);
}

/**
 * Weighted-average (blended) unit cost when receiving new stock into existing
 * on-hand. Falls back sensibly when either side is empty so cost never becomes
 * NaN. Used to update inventory_items.cost_per_unit on receipt while leaving
 * historical recipe_cost_snapshots untouched.
 */
export function blendedUnitCost(
  currentQty: number,
  currentUnitCost: number,
  receivedQty: number,
  receivedUnitCost: number
): number {
  const totalQty = currentQty + receivedQty;
  if (totalQty <= 0) return receivedUnitCost || currentUnitCost || 0;
  if (currentQty <= 0) return receivedUnitCost;
  if (receivedQty <= 0) return currentUnitCost;
  return (currentQty * currentUnitCost + receivedQty * receivedUnitCost) / totalQty;
}
