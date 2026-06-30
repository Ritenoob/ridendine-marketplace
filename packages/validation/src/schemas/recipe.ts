import { z } from 'zod';

// ==========================================
// RECIPE & COSTING (Stage 6) VALIDATION SCHEMAS
// ==========================================

export const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().nonnegative().max(1_000_000),
  unit: z.string().min(1).max(40).default('unit'),
  costPerUnit: z.number().nonnegative().max(1_000_000).default(0),
  wasteFactor: z.number().min(0).max(1).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

export const recipeStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  instruction: z.string().min(1).max(2000),
  station: z.string().max(80).nullable().optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  phase: z.enum(['prep', 'cook']).default('prep'),
});

// Create a recipe with its first version inline.
export const createRecipeSchema = z.object({
  name: z.string().min(1).max(200),
  menuItemId: z.string().uuid().nullable().optional(),
  batchYield: z.number().positive().max(1_000_000).default(1),
  portionSize: z.string().max(80).nullable().optional(),
  wasteFactor: z.number().min(0).max(1).default(0),
  notes: z.string().max(2000).nullable().optional(),
  ingredients: z.array(recipeIngredientSchema).max(200).default([]),
  steps: z.array(recipeStepSchema).max(200).default([]),
});

export const updateRecipeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  menuItemId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Create a new version of an existing recipe.
export const createRecipeVersionSchema = z.object({
  batchYield: z.number().positive().max(1_000_000).default(1),
  portionSize: z.string().max(80).nullable().optional(),
  wasteFactor: z.number().min(0).max(1).default(0),
  notes: z.string().max(2000).nullable().optional(),
  ingredients: z.array(recipeIngredientSchema).max(200).default([]),
  steps: z.array(recipeStepSchema).max(200).default([]),
  activate: z.boolean().default(false),
});

export const packagingItemSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().max(40).nullable().optional(),
  costPerUnit: z.number().nonnegative().max(1_000_000).default(0),
  isActive: z.boolean().default(true),
});

export const menuItemPackagingSchema = z.object({
  packagingItemId: z.string().uuid(),
  quantity: z.number().positive().max(10_000).default(1),
});

// Attach (or replace) the active recipe version for a menu item.
export const attachRecipeToMenuItemSchema = z.object({
  recipeVersionId: z.string().uuid(),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type PackagingItemInput = z.infer<typeof packagingItemSchema>;
