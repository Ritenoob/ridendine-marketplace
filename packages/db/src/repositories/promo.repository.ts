import type { SupabaseClient } from '../client/types';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoValidationResult {
  valid: boolean;
  promoId?: string;
  discount?: number;
  error?: string;
}

export async function hasCustomerUsedPromo(
  client: SupabaseClient,
  promoId: string,
  customerId: string
): Promise<boolean> {
  const { data } = await client
    .from('promo_code_usages')
    .select('id')
    .eq('promo_id', promoId)
    .eq('customer_id', customerId)
    .maybeSingle();
  return !!data;
}

export async function recordPromoUsage(
  client: SupabaseClient,
  promoId: string,
  customerId: string,
  orderId: string
): Promise<void> {
  const { error } = await client
    .from('promo_code_usages')
    .insert({ promo_id: promoId, customer_id: customerId, order_id: orderId });
  if (error && error.code !== '23505') { // ignore unique violation (idempotent)
    throw error;
  }
}

export async function getPromoCodeByCode(
  client: SupabaseClient,
  code: string
): Promise<PromoCode | null> {
  const { data, error } = await client
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PromoCode;
}

export async function validatePromoCode(
  client: SupabaseClient,
  code: string,
  subtotal: number,
  customerId?: string
): Promise<PromoValidationResult> {
  const promo = await getPromoCodeByCode(client, code);

  if (!promo) {
    return { valid: false, error: 'Promo code not found' };
  }

  if (!promo.is_active) {
    return { valid: false, error: 'Promo code is no longer active' };
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Promo code has expired' };
  }

  if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) {
    return { valid: false, error: 'Promo code has reached its usage limit' };
  }

  if (customerId) {
    const used = await hasCustomerUsedPromo(client, promo.id, customerId);
    if (used) {
      return { valid: false, error: 'You have already used this promo code' };
    }
  }

  if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount of $${(promo.min_order_amount / 100).toFixed(2)} required`,
    };
  }

  let discount: number;
  if (promo.discount_type === 'percentage') {
    discount = Math.round(subtotal * (promo.discount_value / 100));
  } else {
    discount = Math.round(promo.discount_value * 100);
  }

  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    promoId: promo.id,
    discount,
  };
}

export async function incrementPromoCodeUsage(
  client: SupabaseClient,
  promoId: string
): Promise<void> {
  const { error } = await client.rpc('increment_promo_usage', {
    promo_id: promoId,
  });

  if (error) {
    // NOTE: supabase-js has no `.raw()`; this legacy fallback is preserved
    // as-is (it throws if ever reached) rather than silently changing behavior.
    const { error: updateError } = await client
      .from('promo_codes')
      .update({
        usage_count: (client as unknown as { raw: (expr: string) => number }).raw('usage_count + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoId);

    if (updateError) {
      console.error('Failed to increment promo usage:', updateError);
    }
  }
}

export async function getActivePromoCodes(
  client: SupabaseClient
): Promise<PromoCode[]> {
  const { data, error } = await client
    .from('promo_codes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PromoCode[];
}

// ==========================================
// OPS-ADMIN PROMO MANAGEMENT
// ==========================================

/** All promo codes (active and inactive), newest first. */
export async function listAllPromoCodes(
  client: SupabaseClient
): Promise<PromoCode[]> {
  const { data, error } = await client
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PromoCode[];
}

export interface PromoCodeCreateInput {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

/** Create a promo code and return the inserted row. */
export async function createPromoCode(
  client: SupabaseClient,
  input: PromoCodeCreateInput
): Promise<PromoCode> {
  const { data, error } = await client
    .from('promo_codes')
    .insert(input as never)
    .select()
    .single();

  if (error) throw error;
  return data as PromoCode;
}

/** Toggle a promo code's active flag and return the updated row. */
export async function setPromoCodeActive(
  client: SupabaseClient,
  id: string,
  isActive: boolean
): Promise<PromoCode> {
  const { data, error } = await client
    .from('promo_codes')
    .update({ is_active: isActive, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PromoCode;
}

/** Permanently delete a promo code. */
export async function deletePromoCode(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from('promo_codes').delete().eq('id', id);
  if (error) throw error;
}
