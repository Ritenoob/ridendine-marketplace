import type { SupabaseClient } from '../client/types';

type AnyRow = Record<string, any>;

export type DriverDeliveryQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export async function getDriverDeliveryDetail(
  client: SupabaseClient,
  deliveryId: string
): Promise<DriverDeliveryQueryResult<AnyRow>> {
  const result = await client
    .from('deliveries')
    .select(`
      *,
      orders!inner (
        id,
        order_number,
        total,
        tip,
        special_instructions,
        customer:customers (
          first_name,
          phone
        ),
        storefront:chef_storefronts (
          name,
          phone,
          kitchen:chef_kitchens (
            address,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            lat,
            lng,
            phone
          )
        ),
        items:order_items (
          quantity,
          menu_item:menu_items (name)
        )
      )
    `)
    .eq('id', deliveryId)
    .single();
  return result as unknown as DriverDeliveryQueryResult<AnyRow>;
}

export async function getPendingAssignmentAttemptForDriver(
  client: SupabaseClient,
  deliveryId: string,
  driverId: string
): Promise<DriverDeliveryQueryResult<AnyRow>> {
  const result = await client
    .from('assignment_attempts')
    .select('*')
    .eq('delivery_id', deliveryId)
    .eq('driver_id', driverId)
    .eq('response', 'pending')
    .single();
  return result as unknown as DriverDeliveryQueryResult<AnyRow>;
}

export async function getPendingAssignmentAttemptRefForDriver(
  client: SupabaseClient,
  deliveryId: string,
  driverId: string
): Promise<DriverDeliveryQueryResult<{ id: string }>> {
  const result = await client
    .from('assignment_attempts')
    .select('id')
    .eq('delivery_id', deliveryId)
    .eq('driver_id', driverId)
    .eq('response', 'pending')
    .maybeSingle();
  return result as unknown as DriverDeliveryQueryResult<{ id: string }>;
}

export async function getDriverDeliveryOrderDetail(
  client: SupabaseClient,
  orderId: string
): Promise<DriverDeliveryQueryResult<AnyRow>> {
  const result = await client
    .from('orders')
    .select('*, customer_addresses(*)')
    .eq('id', orderId)
    .single();
  return result as unknown as DriverDeliveryQueryResult<AnyRow>;
}

export async function getDriverDeliveryOrderRef(
  client: SupabaseClient,
  deliveryId: string
): Promise<DriverDeliveryQueryResult<{ id: string; order_id: string | null }>> {
  const result = await client
    .from('deliveries')
    .select('id, order_id')
    .eq('id', deliveryId)
    .maybeSingle();
  return result as unknown as DriverDeliveryQueryResult<{ id: string; order_id: string | null }>;
}

export async function createDriverDeliveryIssue(
  client: SupabaseClient,
  input: {
    exceptionType: string;
    severity: string;
    orderId: string | null;
    driverId: string;
    deliveryId: string;
    title: string;
    description?: string | null;
    internalNotes: Record<string, unknown>;
  }
): Promise<DriverDeliveryQueryResult<AnyRow>> {
  const result = await client
    .from('order_exceptions')
    .insert({
      exception_type: input.exceptionType,
      severity: input.severity,
      status: 'open',
      order_id: input.orderId,
      driver_id: input.driverId,
      delivery_id: input.deliveryId,
      title: input.title,
      description: input.description,
      recommended_actions: ['Review delivery issue', 'Contact driver or customer if needed'],
      internal_notes: JSON.stringify(input.internalNotes),
    })
    .select()
    .single();
  return result as unknown as DriverDeliveryQueryResult<AnyRow>;
}

export async function listPendingAssignmentOffersForDriver(
  client: SupabaseClient,
  driverId: string,
  nowIso: string
): Promise<DriverDeliveryQueryResult<AnyRow[]>> {
  const result = await client
    .from('assignment_attempts')
    .select(`
      *,
      delivery:deliveries (
        id,
        pickup_address,
        dropoff_address,
        distance_km,
        route_to_dropoff_seconds,
        driver_payout,
        orders!inner (
          order_number,
          total,
          tip,
          storefront:chef_storefronts (name)
        )
      )
    `)
    .eq('driver_id', driverId)
    .eq('response', 'pending')
    .gt('expires_at', nowIso)
    .order('offered_at', { ascending: false });
  return result as unknown as DriverDeliveryQueryResult<AnyRow[]>;
}
