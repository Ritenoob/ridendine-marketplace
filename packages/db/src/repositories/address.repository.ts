import type { SupabaseClient, TableQueryBuilder } from '../client/types';
import type { Tables } from '../generated/database.types';

export type CustomerAddress = Tables<'customer_addresses'>;

export function customerAddressesTable(client: SupabaseClient): TableQueryBuilder {
  return client.from('customer_addresses');
}

export async function getAddressesByCustomer(
  client: SupabaseClient,
  customerId: string
): Promise<CustomerAddress[]> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAddressById(
  client: SupabaseClient,
  id: string
): Promise<CustomerAddress | null> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createAddress(
  client: SupabaseClient,
  address: Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomerAddress> {
  const { data, error } = await client
    .from('customer_addresses')
    .insert(address)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAddress(
  client: SupabaseClient,
  id: string,
  updates: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  const { data, error } = await client
    .from('customer_addresses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAddress(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('customer_addresses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Ownership check: `{ id }` for an address only when it belongs to the given
 * customer, otherwise null.
 */
export async function getCustomerAddressRef(
  client: SupabaseClient,
  addressId: string,
  customerId: string
): Promise<{ id: string } | null> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('id')
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as { id: string } | null) ?? null;
}

export interface AddressGeoFields {
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

/** Street/city/region fields used to (re)geocode an address. */
export async function getAddressGeoFields(
  client: SupabaseClient,
  addressId: string
): Promise<AddressGeoFields | null> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('address_line1, city, state, postal_code, country')
    .eq('id', addressId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as AddressGeoFields;
}

export interface AddressCoordinates {
  lat: number | null;
  lng: number | null;
}

/** `lat, lng` for an address by id (no ownership filter). */
export async function getAddressCoordinatesById(
  client: SupabaseClient,
  addressId: string
): Promise<AddressCoordinates | null> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('lat, lng')
    .eq('id', addressId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as AddressCoordinates;
}

/** `lat, lng` for an address, scoped to the owning customer. */
export async function getCustomerAddressCoordinates(
  client: SupabaseClient,
  addressId: string,
  customerId: string
): Promise<AddressCoordinates | null> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('lat, lng')
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as AddressCoordinates | null) ?? null;
}

export async function setDefaultAddress(
  client: SupabaseClient,
  customerId: string,
  addressId: string
): Promise<void> {
  await client
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId);

  await client
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', addressId);
}
