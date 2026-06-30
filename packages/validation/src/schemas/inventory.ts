import { z } from 'zod';

// ==========================================
// INVENTORY (Stage 7) VALIDATION SCHEMAS
// ==========================================

export const movementTypeSchema = z.enum([
  'receive',
  'consume_order',
  'consume_batch',
  'waste',
  'adjustment',
  'count_correction',
  'transfer',
  'return',
]);

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(80).nullable().optional(),
  unit: z.string().min(1).max(40).default('unit'),
  initialQuantity: z.number().min(0).max(1_000_000).default(0),
  parQuantity: z.number().min(0).max(1_000_000).nullable().optional(),
  reorderPoint: z.number().min(0).max(1_000_000).nullable().optional(),
  costPerUnit: z.number().min(0).max(1_000_000).default(0),
  storageLocationId: z.string().uuid().nullable().optional(),
  expiryDate: z.string().max(40).nullable().optional(),
  lotCode: z.string().max(80).nullable().optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(80).nullable().optional(),
  unit: z.string().min(1).max(40).optional(),
  parQuantity: z.number().min(0).max(1_000_000).nullable().optional(),
  reorderPoint: z.number().min(0).max(1_000_000).nullable().optional(),
  costPerUnit: z.number().min(0).max(1_000_000).optional(),
  storageLocationId: z.string().uuid().nullable().optional(),
  expiryDate: z.string().max(40).nullable().optional(),
  lotCode: z.string().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
});

// A stock movement. `magnitude` is always positive; the movement type decides
// the sign (except adjustment/count_correction/transfer, which use `signedQuantity`).
export const inventoryMovementSchema = z
  .object({
    movementType: movementTypeSchema,
    magnitude: z.number().min(0).max(1_000_000).optional(),
    signedQuantity: z.number().min(-1_000_000).max(1_000_000).optional(),
    unitCost: z.number().min(0).max(1_000_000).nullable().optional(),
    note: z.string().max(500).nullable().optional(),
    referenceType: z.string().max(80).nullable().optional(),
    referenceId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) =>
      ['adjustment', 'count_correction', 'transfer'].includes(v.movementType)
        ? v.signedQuantity !== undefined
        : v.magnitude !== undefined,
    { message: 'Provide magnitude (directional types) or signedQuantity (adjustment/correction/transfer)' }
  );

export const inventoryWasteSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive().max(1_000_000),
  reason: z.string().max(300).nullable().optional(),
});

export const inventoryCountSchema = z.object({
  note: z.string().max(300).nullable().optional(),
  lines: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        countedQuantity: z.number().min(0).max(1_000_000),
      })
    )
    .min(1)
    .max(1000),
});

export const storageLocationSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['fridge', 'freezer', 'dry', 'other']).default('other'),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
export type InventoryCountInput = z.infer<typeof inventoryCountSchema>;
