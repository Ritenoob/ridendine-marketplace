import type { SupabaseClient, TableQueryBuilder } from '../client/types';
import type { Tables } from '../generated/database.types';

export type MenuItem = Tables<'menu_items'>;
export type MenuCategory = Tables<'menu_categories'>;

export function menuItemsTable(client: SupabaseClient): TableQueryBuilder {
  return client.from('menu_items');
}

export function menuItemOptionsTable(client: SupabaseClient): TableQueryBuilder {
  return client.from('menu_item_options');
}

export function menuItemOptionValuesTable(client: SupabaseClient): TableQueryBuilder {
  return client.from('menu_item_option_values');
}

export interface MenuCategorySummary extends MenuCategory {
  items: MenuItem[];
}

export interface MenuItemWithCategory extends MenuItem {
  menu_categories?: Pick<MenuCategory, 'id' | 'name' | 'sort_order'> | null;
}

export async function getMenuItemsByStorefront(
  client: SupabaseClient,
  storefrontId: string,
  options: {
    includeUnavailable?: boolean;
  } = {}
): Promise<MenuItemWithCategory[]> {
  let query = client
    .from('menu_items')
    .select(`
      *,
      menu_categories (
        id,
        name,
        sort_order
      )
    `)
    .eq('storefront_id', storefrontId)
    .order('sort_order', { ascending: true });

  if (!options.includeUnavailable) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function getMenuItemById(
  client: SupabaseClient,
  id: string
): Promise<MenuItem | null> {
  const { data, error } = await client
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createMenuItem(
  client: SupabaseClient,
  item: Partial<MenuItem> & Pick<MenuItem, 'category_id' | 'storefront_id' | 'name' | 'price'>
): Promise<MenuItem> {
  const { data, error } = await client
    .from('menu_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMenuItem(
  client: SupabaseClient,
  id: string,
  updates: Partial<MenuItem>
): Promise<MenuItem> {
  const { data, error } = await client
    .from('menu_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMenuItem(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getFeaturedMenuItems(
  client: SupabaseClient,
  storefrontId: string
): Promise<MenuItem[]> {
  const { data, error } = await client
    .from('menu_items')
    .select('*')
    .eq('storefront_id', storefrontId)
    .eq('is_featured', true)
    .eq('is_available', true)
    .limit(6);

  if (error) throw error;
  return data;
}

export async function getMenuCategoriesByStorefront(
  client: SupabaseClient,
  storefrontId: string
): Promise<MenuCategory[]> {
  const { data, error } = await client
    .from('menu_categories')
    .select('*')
    .eq('storefront_id', storefrontId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createMenuCategory(
  client: SupabaseClient,
  category: Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<MenuCategory> {
  const { data, error } = await client
    .from('menu_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface MenuItemAvailabilityRef {
  id: string;
  storefront_id: string;
  price: number;
  is_available: boolean;
  is_sold_out: boolean;
}

/**
 * Pricing/availability refs for a set of menu items (checkout quote and
 * reorder validation).
 */
export async function listMenuItemAvailabilityRefs(
  client: SupabaseClient,
  menuItemIds: string[]
): Promise<MenuItemAvailabilityRef[]> {
  const { data, error } = await client
    .from('menu_items')
    .select('id, storefront_id, price, is_available, is_sold_out')
    .in('id', menuItemIds as never[]);

  if (error) throw error;
  return (data || []) as unknown as MenuItemAvailabilityRef[];
}

export interface MenuItemOptionValueRef {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
  sort_order?: number;
}

export interface MenuItemOptionWithValues {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order?: number;
  menu_item_option_values?: MenuItemOptionValueRef[];
}

/** Options (with nested values) for a set of menu items. */
export async function listMenuItemOptionsWithValues(
  client: SupabaseClient,
  menuItemIds: string[]
): Promise<MenuItemOptionWithValues[]> {
  const { data, error } = await (client as any)
    .from('menu_item_options')
    .select(
      'id, menu_item_id, name, is_required, max_selections, sort_order, menu_item_option_values(id, option_id, name, price_adjustment, is_available, sort_order)'
    )
    .in('menu_item_id', menuItemIds);

  if (error) throw error;
  return (data ?? []) as MenuItemOptionWithValues[];
}

/**
 * All option rows (with nested values) attached to a storefront's available
 * menu items (public storefront menu API).
 */
export async function listStorefrontMenuItemOptions(
  client: SupabaseClient,
  storefrontId: string
): Promise<Array<Record<string, any>>> {
  const itemsResult = await client
    .from('menu_items')
    .select('id')
    .eq('storefront_id', storefrontId)
    .eq('is_available', true);

  const menuItemIds =
    (itemsResult.data as Array<{ id: string }> | null)?.map((item) => item.id) ?? [];

  const { data, error } = await (client as any)
    .from('menu_item_options')
    .select('*, menu_item_option_values(*)')
    .in('menu_item_id', menuItemIds);

  if (error) throw error;
  return (data ?? []) as Array<Record<string, any>>;
}

/** Exact count of live (available, not sold out) menu items platform-wide. */
export async function countLiveMenuItems(
  client: SupabaseClient
): Promise<number> {
  const { count, error } = await client
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('is_available', true)
    .eq('is_sold_out', false);

  if (error) throw error;
  return count ?? 0;
}

export async function getStorefrontMenu(
  client: SupabaseClient,
  storefrontId: string,
  options: {
    includeUnavailable?: boolean;
  } = {}
): Promise<MenuCategorySummary[]> {
  const [categories, items] = await Promise.all([
    getMenuCategoriesByStorefront(client, storefrontId),
    getMenuItemsByStorefront(client, storefrontId, options),
  ]);

  return categories.map((category) => ({
    ...category,
    items: items
      .filter((item) => item.category_id === category.id)
      .map(({ menu_categories: _menuCategory, ...item }) => item),
  }));
}
