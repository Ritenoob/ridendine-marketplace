export interface StorefrontMenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface StorefrontMenuItemLike {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_available: boolean;
  is_featured?: boolean;
  dietary_tags?: string[] | null;
  prep_time_minutes?: number | null;
  category_id?: string | null;
  menu_categories?: StorefrontMenuCategory | null;
}

export interface StorefrontMenuGroup<T extends StorefrontMenuItemLike = StorefrontMenuItemLike> {
  id: string;
  name: string;
  sortOrder: number;
  items: T[];
}

export interface StorefrontMenuCartItemLike {
  id: string;
  menu_item_id?: string;
  quantity: number;
}

export interface StorefrontMenuFilters {
  search?: string;
  dietaryTags?: string[];
}

export interface MinimumOrderProgress {
  isRequired: boolean;
  isMet: boolean;
  remaining: number;
  percent: number;
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function formatMenuPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

export function groupMenuItemsByCategory<T extends StorefrontMenuItemLike>(
  items: T[],
): StorefrontMenuGroup<T>[] {
  const groups = new Map<string, StorefrontMenuGroup<T>>();

  for (const item of items) {
    const id = item.category_id || item.menu_categories?.id || 'other';
    const name = item.menu_categories?.name || 'Menu';
    const sortOrder = item.menu_categories?.sort_order ?? 99;

    if (!groups.has(id)) {
      groups.set(id, { id, name, sortOrder, items: [] });
    }

    groups.get(id)?.items.push(item);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export function getDietaryTagOptions(items: StorefrontMenuItemLike[]): string[] {
  const tags = new Set<string>();

  for (const item of items) {
    for (const tag of item.dietary_tags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) tags.add(trimmed);
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function filterStorefrontMenuItems<T extends StorefrontMenuItemLike>(
  items: T[],
  filters: StorefrontMenuFilters,
): T[] {
  const search = normalize(filters.search);
  const selectedTags = (filters.dietaryTags ?? []).map(normalize).filter(Boolean);

  return items.filter((item) => {
    if (selectedTags.length > 0) {
      const itemTags = new Set((item.dietary_tags ?? []).map(normalize));
      if (!selectedTags.every((tag) => itemTags.has(tag))) return false;
    }

    if (!search) return true;

    const searchable = [
      item.name,
      item.description,
      item.menu_categories?.name,
      ...(item.dietary_tags ?? []),
    ]
      .map(normalize)
      .join(' ');

    return searchable.includes(search);
  });
}

export function getCartQuantityForMenuItem(
  cartItems: StorefrontMenuCartItemLike[],
  menuItemId: string,
): number {
  return cartItems.reduce((sum, item) => {
    const matchesMenuItem = item.menu_item_id === menuItemId || item.id === menuItemId;
    return matchesMenuItem ? sum + item.quantity : sum;
  }, 0);
}

export function getMinimumOrderProgress(
  subtotal: number,
  minOrderAmount: number,
): MinimumOrderProgress {
  const minimum = Math.max(0, Number(minOrderAmount) || 0);

  if (minimum <= 0) {
    return {
      isRequired: false,
      isMet: true,
      remaining: 0,
      percent: 100,
    };
  }

  const current = Math.max(0, Number(subtotal) || 0);
  const remaining = Math.max(0, minimum - current);

  return {
    isRequired: true,
    isMet: remaining === 0,
    remaining: Math.round(remaining * 100) / 100,
    percent: Math.min(100, Math.round((current / minimum) * 100)),
  };
}
