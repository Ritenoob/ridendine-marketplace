import type { SupabaseClient } from '../client/types';

export type DriverLocationQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type DriverLocationMutationResult = {
  error: { message?: string; code?: string } | null;
};

export type DriverLocationDeliveryOwnerRow = {
  id: string;
  driver_id: string | null;
};

export type DriverLocationDeliveryContextRow = {
  id: string;
  driver_id: string | null;
  status: string | null;
  order_id: string | null;
};

export type DriverLocationEtaSnapshotRow = {
  eta_pickup_at?: string | null;
  route_to_dropoff_polyline?: string | null;
};

export type DriverLocationOrderStageRow = {
  public_stage?: string | null;
};

export type DriverLocationPayload = {
  driverId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  recordedAt: string;
};

export type DeliveryTrackingLocationPayload = {
  deliveryId: string;
  driverId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  recordedAt: string;
};

export async function getDeliveryOwnerForDriverLocation(
  client: SupabaseClient,
  deliveryId: string
): Promise<DriverLocationQueryResult<DriverLocationDeliveryOwnerRow>> {
  const result = await client
    .from('deliveries')
    .select('id, driver_id')
    .eq('id', deliveryId)
    .maybeSingle();
  return result as unknown as DriverLocationQueryResult<DriverLocationDeliveryOwnerRow>;
}

export async function upsertDriverCurrentLocation(
  client: SupabaseClient,
  payload: DriverLocationPayload
): Promise<DriverLocationMutationResult> {
  const result = await client
    .from('driver_presence')
    .upsert(
      {
        driver_id: payload.driverId,
        current_lat: payload.lat,
        current_lng: payload.lng,
        last_location_lat: payload.lat,
        last_location_lng: payload.lng,
        last_location_update: payload.recordedAt,
        last_location_at: payload.recordedAt,
        last_updated_at: payload.recordedAt,
        updated_at: payload.recordedAt,
      },
      { onConflict: 'driver_id' }
    );
  return { error: result.error };
}

export async function insertDriverLocation(
  client: SupabaseClient,
  payload: DriverLocationPayload
): Promise<DriverLocationMutationResult> {
  const result = await client.from('driver_locations').insert({
    driver_id: payload.driverId,
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy ?? null,
    heading: payload.heading ?? null,
    speed: payload.speed ?? null,
    recorded_at: payload.recordedAt,
  });
  return { error: result.error };
}

export async function getDeliveryContextForDriverLocation(
  client: SupabaseClient,
  deliveryId: string
): Promise<DriverLocationQueryResult<DriverLocationDeliveryContextRow>> {
  const result = await client
    .from('deliveries')
    .select('id, driver_id, status, order_id')
    .eq('id', deliveryId)
    .single();
  return result as unknown as DriverLocationQueryResult<DriverLocationDeliveryContextRow>;
}

export async function insertDeliveryTrackingLocation(
  client: SupabaseClient,
  payload: DeliveryTrackingLocationPayload
): Promise<DriverLocationMutationResult> {
  const result = await client.from('delivery_tracking_events').insert({
    delivery_id: payload.deliveryId,
    driver_id: payload.driverId,
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy ?? null,
    recorded_at: payload.recordedAt,
  });
  return { error: result.error };
}

export async function getDeliveryEtaSnapshotForDriverLocation(
  client: SupabaseClient,
  deliveryId: string
): Promise<DriverLocationQueryResult<DriverLocationEtaSnapshotRow>> {
  const result = await client
    .from('deliveries')
    .select('eta_pickup_at, route_to_dropoff_polyline')
    .eq('id', deliveryId)
    .maybeSingle();
  return result as unknown as DriverLocationQueryResult<DriverLocationEtaSnapshotRow>;
}

export async function getOrderPublicStageForDriverLocation(
  client: SupabaseClient,
  orderId: string
): Promise<DriverLocationQueryResult<DriverLocationOrderStageRow>> {
  const result = await client
    .from('orders')
    .select('public_stage')
    .eq('id', orderId)
    .maybeSingle();
  return result as unknown as DriverLocationQueryResult<DriverLocationOrderStageRow>;
}
