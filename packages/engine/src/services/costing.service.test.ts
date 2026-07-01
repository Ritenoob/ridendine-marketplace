import { describe, expect, it } from 'vitest';
import {
  computeIngredientLineCost,
  computeBatchIngredientCost,
  computePerPortionFoodCost,
  computePackagingCost,
  computeMenuItemCosting,
  computeCostSummary,
  DEFAULT_TARGET_FOOD_COST_PCT,
} from './costing.service';

describe('costing.service', () => {
  it('applies waste factor to an ingredient line', () => {
    // 2 units * $3 * (1 + 0.10 waste) = 6.6
    expect(computeIngredientLineCost({ quantity: 2, costPerUnit: 3, wasteFactor: 0.1 })).toBeCloseTo(6.6, 5);
    // no waste factor -> plain product
    expect(computeIngredientLineCost({ quantity: 2, costPerUnit: 3 })).toBeCloseTo(6, 5);
    // negative waste is clamped to 0
    expect(computeIngredientLineCost({ quantity: 1, costPerUnit: 5, wasteFactor: -1 })).toBeCloseTo(5, 5);
  });

  it('sums batch ingredient cost and spreads it over the yield', () => {
    const ingredients = [
      { quantity: 1000, costPerUnit: 0.01 }, // $10
      { quantity: 4, costPerUnit: 2, wasteFactor: 0.25 }, // 4*2*1.25 = $10
    ];
    const batch = computeBatchIngredientCost(ingredients);
    expect(batch).toBeCloseTo(20, 5);
    expect(computePerPortionFoodCost(batch, 10)).toBeCloseTo(2, 5);
    // zero/negative yield falls back to the batch cost (avoids divide-by-zero)
    expect(computePerPortionFoodCost(batch, 0)).toBeCloseTo(20, 5);
  });

  it('sums packaging cost with quantities', () => {
    expect(computePackagingCost([{ costPerUnit: 0.5 }, { costPerUnit: 0.25, quantity: 2 }])).toBeCloseTo(1.0, 5);
    expect(computePackagingCost()).toBe(0);
  });

  it('produces a full breakdown with margin and food-cost %', () => {
    const result = computeMenuItemCosting({
      ingredients: [{ quantity: 1, costPerUnit: 3 }], // $3 batch
      batchYield: 1,
      packaging: [{ costPerUnit: 0.5 }],
      sellPrice: 14,
      targetFoodCostPct: 0.3,
    });
    expect(result.perPortionFoodCost).toBe(3);
    expect(result.packagingCost).toBe(0.5);
    expect(result.totalItemCost).toBe(3.5);
    expect(result.grossMargin).toBe(10.5);
    expect(result.foodCostPct).toBe(0.25); // 3.5 / 14
    expect(result.suggestedPrice).toBeCloseTo(11.67, 2); // 3.5 / 0.30
    expect(result.marginWarning).toBe(false); // 25% < 30% target
  });

  it('flags a margin warning when food cost exceeds the target', () => {
    const result = computeMenuItemCosting({
      ingredients: [{ quantity: 1, costPerUnit: 6 }],
      batchYield: 1,
      sellPrice: 10,
      targetFoodCostPct: 0.3,
    });
    expect(result.foodCostPct).toBe(0.6); // 6 / 10
    expect(result.marginWarning).toBe(true);
  });

  it('handles a missing sell price without dividing by zero', () => {
    const result = computeMenuItemCosting({
      ingredients: [{ quantity: 1, costPerUnit: 4 }],
      batchYield: 2,
      sellPrice: 0,
    });
    expect(result.perPortionFoodCost).toBe(2);
    expect(result.foodCostPct).toBeNull();
    expect(result.marginWarning).toBe(false);
    expect(result.targetFoodCostPct).toBe(DEFAULT_TARGET_FOOD_COST_PCT);
  });
});

describe('computeCostSummary', () => {
  it('computes prime cost and ratios when data exists', () => {
    const s = computeCostSummary({ sales: 1000, foodCost: 300, laborCost: 250, packagingCost: 50, wasteValue: 20 });
    expect(s.primeCost).toBe(550);
    expect(s.foodCostPct).toBe(0.3);
    expect(s.laborCostPct).toBe(0.25);
    expect(s.primeCostPct).toBe(0.55);
    expect(s.contributionMargin).toBe(1000 - (300 + 50 + 250));
  });

  it('returns null (not zero) for unknown food/labour and zero sales', () => {
    const s = computeCostSummary({ sales: 0 });
    expect(s.primeCost).toBeNull();
    expect(s.foodCostPct).toBeNull();
    expect(s.laborCostPct).toBeNull();
    expect(s.contributionMargin).toBeNull();
  });

  it('computes labour-only prime cost when food cost is unknown', () => {
    const s = computeCostSummary({ sales: 800, laborCost: 200 });
    expect(s.primeCost).toBe(200);
    expect(s.laborCostPct).toBe(0.25);
    expect(s.foodCostPct).toBeNull();
  });
});
