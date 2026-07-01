import { z } from 'zod';

// ==========================================
// SUPPLIERS & PURCHASING (Stage 8) VALIDATION SCHEMAS
// ==========================================

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const supplierItemSchema = z.object({
  inventoryItemId: z.string().uuid().nullable().optional(),
  supplierSku: z.string().max(120).nullable().optional(),
  name: z.string().min(1).max(200),
  packSize: z.number().positive().max(1_000_000).default(1),
  packUnit: z.string().max(40).nullable().optional(),
  unitCost: z.number().min(0).max(1_000_000).default(0),
});

export const purchaseOrderLineSchema = z.object({
  supplierItemId: z.string().uuid().nullable().optional(),
  inventoryItemId: z.string().uuid().nullable().optional(),
  description: z.string().max(300).nullable().optional(),
  quantity: z.number().positive().max(1_000_000),
  packSize: z.number().positive().max(1_000_000).default(1),
  unitCost: z.number().min(0).max(1_000_000).default(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid().nullable().optional(),
  reference: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  expectedAt: z.string().max(40).nullable().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1).max(500),
});

export const updatePurchaseOrderSchema = z.object({
  status: z.enum(['draft', 'submitted', 'cancelled']).optional(),
  reference: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  expectedAt: z.string().max(40).nullable().optional(),
});

// Receive some/all of a purchase order. Each line records packs actually received.
export const receivePurchaseOrderSchema = z.object({
  note: z.string().max(500).nullable().optional(),
  lines: z
    .array(
      z.object({
        purchaseOrderLineId: z.string().uuid(),
        receivedPacks: z.number().min(0).max(1_000_000),
      })
    )
    .min(1)
    .max(500),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
