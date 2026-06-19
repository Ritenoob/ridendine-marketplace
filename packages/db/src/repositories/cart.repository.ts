import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Cart = Tables<'carts'>;
export type CartItem = Tables<'cart_items'>;

export type CartItemWithMenuItem = Omit<CartItem, 'selected_options'> & {
  // Stored as JSONB; consumers (e.g. apps/web checkout quote) narrow it to
  // their structured option shape, so keep it open here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selected_options: any;
  menu_items: Tables<'menu_items'> | null;
};

export type CartWithItems = Cart & { cart_items: CartItemWithMenuItem[] };

export async function getCartByCustomer(
  client: SupabaseClient,
  customerId: string,
  storefrontId: string
): Promise<Cart | null> {
  const { data, error } = await client
    .from('carts')
    .select('*')
    .eq('customer_id', customerId)
    .eq('storefront_id', storefrontId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getCartWithItems(
  client: SupabaseClient,
  customerId: string,
  storefrontId: string
): Promise<CartWithItems | null> {
  const { data, error } = await client
    .from('carts')
    .select(`
      *,
      cart_items (
        *,
        menu_items (*)
      )
    `)
    .eq('customer_id', customerId)
    .eq('storefront_id', storefrontId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createCart(
  client: SupabaseClient,
  cart: Omit<Cart, 'id' | 'created_at' | 'updated_at'>
): Promise<Cart> {
  const { data, error } = await client
    .from('carts')
    .insert(cart)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCartItems(
  client: SupabaseClient,
  cartId: string
): Promise<CartItem[]> {
  const { data, error } = await client
    .from('cart_items')
    .select('*, menu_items(*)')
    .eq('cart_id', cartId);

  if (error) throw error;
  return data;
}

export async function addCartItem(
  client: SupabaseClient,
  item: Omit<CartItem, 'id' | 'created_at' | 'updated_at'>
): Promise<CartItem> {
  const { data, error } = await client
    .from('cart_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCartItem(
  client: SupabaseClient,
  id: string,
  updates: Partial<CartItem>
): Promise<CartItem> {
  const { data, error } = await client
    .from('cart_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCartItem(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('cart_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Ownership check: `{ id }` for a cart item only when its parent cart belongs
 * to the given customer, otherwise null.
 */
export async function getCustomerCartItemRef(
  client: SupabaseClient,
  cartItemId: string,
  customerId: string
): Promise<{ id: string } | null> {
  const { data, error } = await client
    .from('cart_items')
    .select('id, carts!inner(customer_id)')
    .eq('id', cartItemId)
    .eq('carts.customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as { id: string } | null) ?? null;
}

export async function clearCart(
  client: SupabaseClient,
  cartId: string
): Promise<void> {
  const { error } = await client
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId);

  if (error) throw error;
}
