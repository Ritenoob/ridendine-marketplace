// ==========================================
// PARTNER ORDER MATERIALIZATION
// Turns an inline partner checkout payload (customer + address + items) into the
// same DB rows a logged-in customer would have, so the existing, tested
// quote -> order -> PaymentIntent path can run unchanged. RideNDine remains the
// merchant of record; partner customers are guest customers (user_id = null).
// ==========================================

import {
  createAddress,
  createCart,
  getCartByCustomer,
  clearCart,
  createCustomer,
  type SupabaseClient,
} from '@ridendine/db';
import { geocodeAddress, buildAddressString } from '@ridendine/engine';
import type {
  PartnerCustomerInput,
  PartnerDeliveryAddressInput,
  PartnerCheckoutItemInput,
} from '@ridendine/validation';

export class MaterializeError extends Error {
  constructor(
    public readonly code: string,
    public readonly publicMessage: string,
    public readonly status: number = 400
  ) {
    super(publicMessage);
    this.name = 'MaterializeError';
  }
}

export interface MaterializedOrder {
  customerId: string;
  deliveryAddressId: string;
  cartId: string;
}

/**
 * Find an existing guest customer by email (user_id IS NULL) or create one.
 * Registered customers (with a user_id) are never reused, so a partner order
 * can never attach to — or mutate — a real account.
 */
async function findOrCreatePartnerCustomer(
  admin: SupabaseClient,
  customer: PartnerCustomerInput
): Promise<string> {
  const { data: existing } = await (admin as any)
    .from('customers')
    .select('id')
    .eq('email', customer.email)
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const created = await createCustomer(admin, {
    user_id: null,
    email: customer.email,
    first_name: customer.firstName,
    last_name: customer.lastName ?? '',
    phone: customer.phone ?? null,
    profile_image_url: null,
  } as never);
  return created.id;
}

/** Create a fresh delivery address row for the guest customer (geocoded). */
async function createPartnerAddress(
  admin: SupabaseClient,
  customerId: string,
  address: PartnerDeliveryAddressInput
): Promise<string> {
  let lat = address.lat ?? null;
  let lng = address.lng ?? null;

  if (lat === null || lng === null) {
    const coords = await geocodeAddress(
      buildAddressString({
        streetAddress: address.addressLine1,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country || 'CA',
      })
    );
    if (coords) {
      lat = coords.latitude;
      lng = coords.longitude;
    }
  }

  const created = await createAddress(admin, {
    customer_id: customerId,
    label: address.label || 'Delivery',
    address_line1: address.addressLine1,
    address_line2: address.addressLine2 ?? null,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode,
    country: address.country || 'CA',
    lat,
    lng,
    delivery_instructions: address.deliveryInstructions ?? null,
    is_default: false,
  } as never);
  return created.id;
}

/**
 * Replace the guest customer's cart for this storefront with exactly the partner
 * items. unit_price is set from the canonical menu_items.price so the downstream
 * quote's stale-price guard passes; final pricing is still computed server-side.
 */
async function replacePartnerCart(
  admin: SupabaseClient,
  customerId: string,
  storefrontId: string,
  items: PartnerCheckoutItemInput[]
): Promise<string> {
  const menuItemIds = Array.from(new Set(items.map((i) => i.menuItemId)));
  const { data: menuRows, error: menuError } = await (admin as any)
    .from('menu_items')
    .select('id, price, storefront_id')
    .in('id', menuItemIds);

  if (menuError) {
    throw new MaterializeError('INTERNAL_ERROR', 'Failed to load menu items', 500);
  }

  const priceById = new Map<string, { price: number; storefrontId: string }>(
    (menuRows ?? []).map((m: { id: string; price: number; storefront_id: string }) => [
      m.id,
      { price: Number(m.price), storefrontId: m.storefront_id },
    ])
  );

  const missing = menuItemIds.filter((id) => !priceById.has(id));
  if (missing.length > 0) {
    throw new MaterializeError('INVALID_ITEMS', `Menu item(s) not found: ${missing.join(', ')}`);
  }
  const wrongStorefront = menuItemIds.filter(
    (id) => priceById.get(id)!.storefrontId !== storefrontId
  );
  if (wrongStorefront.length > 0) {
    throw new MaterializeError(
      'VALIDATION_ERROR',
      'All items must belong to the requested storefront'
    );
  }

  let cart = await getCartByCustomer(admin, customerId, storefrontId);
  if (!cart) {
    cart = await createCart(admin, {
      customer_id: customerId,
      storefront_id: storefrontId,
    } as never);
  } else {
    await clearCart(admin, cart.id);
  }

  const rows = items.map((item) => ({
    cart_id: cart!.id,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    unit_price: priceById.get(item.menuItemId)!.price,
    special_instructions: item.specialInstructions ?? null,
    selected_options: (item.selectedOptions ?? []).map((o) => ({
      optionId: o.optionId,
      valueId: o.valueId,
    })),
  }));

  const { error: insertError } = await (admin as any).from('cart_items').insert(rows);
  if (insertError) {
    throw new MaterializeError('INTERNAL_ERROR', 'Failed to build cart', 500);
  }

  return cart.id;
}

export async function materializePartnerOrder(
  admin: SupabaseClient,
  input: {
    storefrontId: string;
    customer: PartnerCustomerInput;
    deliveryAddress: PartnerDeliveryAddressInput;
    items: PartnerCheckoutItemInput[];
  }
): Promise<MaterializedOrder> {
  const customerId = await findOrCreatePartnerCustomer(admin, input.customer);
  const deliveryAddressId = await createPartnerAddress(admin, customerId, input.deliveryAddress);
  const cartId = await replacePartnerCart(admin, customerId, input.storefrontId, input.items);
  return { customerId, deliveryAddressId, cartId };
}
