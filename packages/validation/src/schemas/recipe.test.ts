// ==========================================
// RECIPE & COSTING SCHEMA TESTS (Stage 6)
// ==========================================

import { describe, expect, it } from 'vitest';
import {
  createRecipeSchema,
  recipeIngredientSchema,
  packagingItemSchema,
  menuItemPackagingSchema,
} from './recipe';

const UUID = '44444444-4444-4444-8444-444444444444';

describe('recipeIngredientSchema', () => {
  it('accepts a valid ingredient and applies defaults', () => {
    const r = recipeIngredientSchema.safeParse({ name: 'Rice', quantity: 1000 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unit).toBe('unit');
      expect(r.data.costPerUnit).toBe(0);
      expect(r.data.wasteFactor).toBe(0);
    }
  });

  it('rejects a waste factor above 1 and a negative quantity', () => {
    expect(recipeIngredientSchema.safeParse({ name: 'X', quantity: 1, wasteFactor: 1.5 }).success).toBe(false);
    expect(recipeIngredientSchema.safeParse({ name: 'X', quantity: -1 }).success).toBe(false);
  });
});

describe('createRecipeSchema', () => {
  it('accepts a recipe with ingredients and steps', () => {
    const r = createRecipeSchema.safeParse({
      name: 'Pho Broth',
      menuItemId: UUID,
      batchYield: 10,
      ingredients: [{ name: 'Bones', quantity: 5, unit: 'kg', costPerUnit: 4 }],
      steps: [{ stepNumber: 1, instruction: 'Simmer 6h', phase: 'cook' }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a non-positive batch yield', () => {
    expect(createRecipeSchema.safeParse({ name: 'X', batchYield: 0 }).success).toBe(false);
  });

  it('defaults ingredients/steps to empty arrays', () => {
    const r = createRecipeSchema.safeParse({ name: 'Simple' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ingredients).toEqual([]);
      expect(r.data.steps).toEqual([]);
      expect(r.data.batchYield).toBe(1);
    }
  });
});

describe('packaging schemas', () => {
  it('validates a packaging item and a menu-item link', () => {
    expect(packagingItemSchema.safeParse({ name: 'Clamshell', costPerUnit: 0.35 }).success).toBe(true);
    expect(menuItemPackagingSchema.safeParse({ packagingItemId: UUID, quantity: 2 }).success).toBe(true);
    expect(menuItemPackagingSchema.safeParse({ packagingItemId: UUID, quantity: 0 }).success).toBe(false);
  });
});
