/**
 * @jest-environment node
 */
import { sumOrderFoodCost, type OrderItemForFoodCost } from '../food-cost';

describe('sumOrderFoodCost', () => {
  const costs = new Map<string, number>([
    ['m1', 3], // $3/portion
    ['m2', 1.5],
  ]);

  it('sums quantity × per-portion cost across items', () => {
    const items: OrderItemForFoodCost[] = [
      { menu_item_id: 'm1', quantity: 2 }, // 6
      { menu_item_id: 'm2', quantity: 4 }, // 6
    ];
    expect(sumOrderFoodCost(items, costs)).toBe(12);
  });

  it('ignores items without a costed recipe', () => {
    const items: OrderItemForFoodCost[] = [
      { menu_item_id: 'm1', quantity: 1 }, // 3
      { menu_item_id: 'unknown', quantity: 5 }, // no cost -> skipped
    ];
    expect(sumOrderFoodCost(items, costs)).toBe(3);
  });

  it('supports the nested menu_item.id shape and skips null ids', () => {
    const items: OrderItemForFoodCost[] = [
      { menu_item: { id: 'm2' }, quantity: 2 }, // 3
      { menu_item_id: null, quantity: 9 }, // skipped
    ];
    expect(sumOrderFoodCost(items, costs)).toBe(3);
  });

  it('returns 0 for an empty order', () => {
    expect(sumOrderFoodCost([], costs)).toBe(0);
  });
});
