import { z } from 'zod';

// ==========================================
// PRODUCTION PLANNING (Stage 9) VALIDATION SCHEMAS
// ==========================================

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createPrepTaskSchema = z.object({
  title: z.string().min(1).max(200),
  menuItemId: z.string().uuid().nullable().optional(),
  stationId: z.string().uuid().nullable().optional(),
  targetQuantity: z.number().min(0).max(1_000_000).nullable().optional(),
  planDate: dateString,
  notes: z.string().max(1000).nullable().optional(),
});

export const updatePrepTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    status: z.enum(['pending', 'in_progress', 'done']).optional(),
    completedQuantity: z.number().min(0).max(1_000_000).optional(),
    targetQuantity: z.number().min(0).max(1_000_000).nullable().optional(),
    stationId: z.string().uuid().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

// Generate suggested prep tasks for a date from historical same-weekday demand.
export const forecastSchema = z.object({
  planDate: dateString,
  lookbackWeeks: z.number().int().min(1).max(12).default(4),
});

export const batchInputSchema = z.object({
  inventoryItemId: z.string().uuid().nullable().optional(),
  quantity: z.number().min(0).max(1_000_000),
  unit: z.string().max(40).nullable().optional(),
});

export const createProductionBatchSchema = z.object({
  name: z.string().min(1).max(200),
  recipeVersionId: z.string().uuid().nullable().optional(),
  menuItemId: z.string().uuid().nullable().optional(),
  plannedYield: z.number().min(0).max(1_000_000).nullable().optional(),
  planDate: dateString.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  inputs: z.array(batchInputSchema).max(200).default([]),
});

export const updateProductionBatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    status: z.enum(['planned', 'in_progress', 'cancelled']).optional(),
    plannedYield: z.number().min(0).max(1_000_000).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const completeBatchSchema = z.object({
  actualYield: z.number().min(0).max(1_000_000),
  wasteQuantity: z.number().min(0).max(1_000_000).default(0),
  outputs: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid().nullable().optional(),
        menuItemId: z.string().uuid().nullable().optional(),
        quantity: z.number().min(0).max(1_000_000),
      })
    )
    .max(200)
    .default([]),
});

export const batchWasteSchema = z.object({
  quantity: z.number().positive().max(1_000_000),
  reason: z.string().max(300).nullable().optional(),
});

export type CreatePrepTaskInput = z.infer<typeof createPrepTaskSchema>;
export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>;
export type CompleteBatchInput = z.infer<typeof completeBatchSchema>;
