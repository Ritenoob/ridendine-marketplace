/**
 * @jest-environment node
 */
import {
  filterStorefrontMenuItems,
  formatMenuPrice,
  getCartQuantityForMenuItem,
  getDietaryTagOptions,
  getMinimumOrderProgress,
  groupMenuItemsByCategory,
} from '@/lib/storefront-menu';

const menuItems = [
  {
    id: 'item-1',
    name: 'Butter Chicken',
    description: 'Creamy tomato curry',
    price: 18.99,
    image_url: null,
    is_available: true,
    is_featured: true,
    dietary_tags: ['Gluten-free'],
    prep_time_minutes: 18,
    category_id: 'mains',
    menu_categories: { id: 'mains', name: 'Mains', sort_order: 2 },
  },
  {
    id: 'item-2',
    name: 'Samosa Chaat',
    description: 'Crisp samosas with chickpeas',
    price: 11.5,
    image_url: null,
    is_available: true,
    is_featured: false,
    dietary_tags: ['Vegetarian', 'Spicy'],
    prep_time_minutes: 10,
    category_id: 'starters',
    menu_categories: { id: 'starters', name: 'Starters', sort_order: 1 },
  },
  {
    id: 'item-3',
    name: 'Mango Lassi',
    description: 'Sweet yogurt drink',
    price: 6,
    image_url: null,
    is_available: true,
    is_featured: false,
    dietary_tags: ['Vegetarian'],
    prep_time_minutes: 5,
    category_id: 'drinks',
    menu_categories: { id: 'drinks', name: 'Drinks', sort_order: 3 },
  },
];

describe('storefront menu helpers', () => {
  it('groups menu items by category sort order', () => {
    const grouped = groupMenuItemsByCategory(menuItems);

    expect(grouped.map((group) => group.name)).toEqual(['Starters', 'Mains', 'Drinks']);
    expect(grouped[0].items.map((item) => item.name)).toEqual(['Samosa Chaat']);
  });

  it('derives unique dietary tags in customer-friendly order', () => {
    expect(getDietaryTagOptions(menuItems)).toEqual(['Gluten-free', 'Spicy', 'Vegetarian']);
  });

  it('filters by dish name, description, category, and dietary tag', () => {
    expect(filterStorefrontMenuItems(menuItems, { search: 'curry', dietaryTags: [] }).map((item) => item.name))
      .toEqual(['Butter Chicken']);
    expect(filterStorefrontMenuItems(menuItems, { search: 'starters', dietaryTags: [] }).map((item) => item.name))
      .toEqual(['Samosa Chaat']);
    expect(filterStorefrontMenuItems(menuItems, { search: '', dietaryTags: ['Vegetarian'] }).map((item) => item.name))
      .toEqual(['Samosa Chaat', 'Mango Lassi']);
  });

  it('reports minimum-order progress with remaining dollars and percent', () => {
    expect(getMinimumOrderProgress(18, 25)).toEqual({
      isRequired: true,
      isMet: false,
      remaining: 7,
      percent: 72,
    });
    expect(getMinimumOrderProgress(28, 25)).toMatchObject({
      isRequired: true,
      isMet: true,
      remaining: 0,
      percent: 100,
    });
  });

  it('formats prices and resolves in-cart quantity for a menu item', () => {
    expect(formatMenuPrice(12)).toBe('$12.00');
    expect(
      getCartQuantityForMenuItem(
        [
          { id: 'cart-1', menu_item_id: 'item-1', quantity: 2 },
          { id: 'item-2', quantity: 1 },
        ],
        'item-1',
      ),
    ).toBe(2);
    expect(getCartQuantityForMenuItem([{ id: 'item-2', quantity: 1 }], 'item-2')).toBe(1);
  });
});
