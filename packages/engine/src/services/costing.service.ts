// ==========================================
// COSTING SERVICE (Stage 6)
//
// Pure food-cost / margin math. No DB access: callers pass already-fetched
// ingredient and packaging rows; this computes the cost breakdown. Keeping it
// pure makes it exhaustively unit-testable and reusable by both live costing
// and "current-cost simulation" views.
//
// Money is in dollars. Percentages are fractions (0.30 = 30%).
// ==========================================

export interface IngredientCostInput {
  /** Amount used by the recipe, expressed in `unit`. */
  quantity: number;
  /** Dollars per unit. */
  costPerUnit: number;
  /** Fraction lost to trim/spoilage, 0..1 (e.g. 0.05 = 5%). */
  wasteFactor?: number;
}

export interface PackagingCostInput {
  costPerUnit: number;
  quantity?: number;
}

export interface MenuItemCostingInput {
  ingredients: IngredientCostInput[];
  /** Portions produced by one batch of the recipe. */
  batchYield: number;
  packaging?: PackagingCostInput[];
  sellPrice: number;
  /** Target food-cost fraction used for the suggested price (default 30%). */
  targetFoodCostPct?: number;
}

export interface MenuItemCosting {
  batchIngredientCost: number;
  perPortionFoodCost: number;
  packagingCost: number;
  totalItemCost: number;
  sellPrice: number;
  grossMargin: number;
  /** totalItemCost / sellPrice, or null when there is no sell price. */
  foodCostPct: number | null;
  /** Price that would hit targetFoodCostPct, or null if target is 0. */
  suggestedPrice: number | null;
  targetFoodCostPct: number;
  /** True when food cost % exceeds the target (item is under-priced). */
  marginWarning: boolean;
}

export const DEFAULT_TARGET_FOOD_COST_PCT = 0.3;

// ------------------------------------------------------------------
// Day-level cost summary (Stage 11). Prime cost = food + labour. Ratios are
// null (not zero) when there are no sales, so the UI never invents a number.
// ------------------------------------------------------------------
export interface CostSummaryInput {
  sales: number;
  foodCost?: number | null;
  packagingCost?: number | null;
  laborCost?: number | null;
  wasteValue?: number | null;
  refundLoss?: number | null;
}

export interface CostSummary {
  sales: number;
  foodCost: number | null;
  packagingCost: number | null;
  laborCost: number | null;
  wasteValue: number | null;
  refundLoss: number | null;
  /** food + labour, or null when neither is known. */
  primeCost: number | null;
  foodCostPct: number | null;
  laborCostPct: number | null;
  primeCostPct: number | null;
  /** sales − (food + packaging + labour), or null when inputs are unknown. */
  contributionMargin: number | null;
}

function pct(part: number | null, whole: number): number | null {
  if (part === null || whole <= 0) return null;
  return Math.round((part / whole) * 10000) / 10000;
}

export function computeCostSummary(input: CostSummaryInput): CostSummary {
  const sales = input.sales;
  const foodCost = input.foodCost ?? null;
  const packagingCost = input.packagingCost ?? null;
  const laborCost = input.laborCost ?? null;
  const wasteValue = input.wasteValue ?? null;
  const refundLoss = input.refundLoss ?? null;

  const primeCost =
    foodCost === null && laborCost === null ? null : (foodCost ?? 0) + (laborCost ?? 0);

  const contributionMargin =
    foodCost === null && laborCost === null && packagingCost === null
      ? null
      : sales - ((foodCost ?? 0) + (packagingCost ?? 0) + (laborCost ?? 0));

  return {
    sales,
    foodCost,
    packagingCost,
    laborCost,
    wasteValue,
    refundLoss,
    primeCost,
    foodCostPct: pct(foodCost, sales),
    laborCostPct: pct(laborCost, sales),
    primeCostPct: pct(primeCost, sales),
    contributionMargin,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/** Cost of a single ingredient line, including its waste factor. */
export function computeIngredientLineCost(ingredient: IngredientCostInput): number {
  const waste = Math.max(0, ingredient.wasteFactor ?? 0);
  return ingredient.quantity * ingredient.costPerUnit * (1 + waste);
}

/** Total ingredient cost to produce one batch. */
export function computeBatchIngredientCost(ingredients: IngredientCostInput[]): number {
  return ingredients.reduce((sum, i) => sum + computeIngredientLineCost(i), 0);
}

/** Per-portion food cost: batch cost spread across the batch yield. */
export function computePerPortionFoodCost(batchCost: number, batchYield: number): number {
  if (batchYield <= 0) return batchCost;
  return batchCost / batchYield;
}

export function computePackagingCost(packaging: PackagingCostInput[] = []): number {
  return packaging.reduce((sum, p) => sum + p.costPerUnit * (p.quantity ?? 1), 0);
}

/**
 * Full cost + margin breakdown for one menu item portion. All monetary fields
 * are rounded to cents; percentages to 4 dp.
 */
export function computeMenuItemCosting(input: MenuItemCostingInput): MenuItemCosting {
  const target = input.targetFoodCostPct ?? DEFAULT_TARGET_FOOD_COST_PCT;

  const batchIngredientCost = computeBatchIngredientCost(input.ingredients);
  const perPortionFoodCost = computePerPortionFoodCost(batchIngredientCost, input.batchYield);
  const packagingCost = computePackagingCost(input.packaging);
  const totalItemCost = perPortionFoodCost + packagingCost;

  const sellPrice = input.sellPrice;
  const grossMargin = sellPrice - totalItemCost;
  const foodCostPct = sellPrice > 0 ? totalItemCost / sellPrice : null;
  const suggestedPrice = target > 0 ? totalItemCost / target : null;
  const marginWarning = foodCostPct !== null && foodCostPct > target;

  return {
    batchIngredientCost: round2(batchIngredientCost),
    perPortionFoodCost: round2(perPortionFoodCost),
    packagingCost: round2(packagingCost),
    totalItemCost: round2(totalItemCost),
    sellPrice: round2(sellPrice),
    grossMargin: round2(grossMargin),
    foodCostPct: foodCostPct === null ? null : round4(foodCostPct),
    suggestedPrice: suggestedPrice === null ? null : round2(suggestedPrice),
    targetFoodCostPct: target,
    marginWarning,
  };
}
