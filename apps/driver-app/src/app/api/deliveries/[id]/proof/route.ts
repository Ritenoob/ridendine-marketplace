import type { NextRequest } from 'next/server';
import { driverDeliveryProofSchema } from '@ridendine/validation';
import { createAdminClient, getDeliveryById } from '@ridendine/db';
import { calculateDistanceKm } from '@ridendine/utils';
import {
  getEngine,
  getDriverActorContext,
  verifyDriverOwnsDelivery,
  errorResponse,
  successResponse,
} from '@/lib/engine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: deliveryId } = await params;
  const driverContext = await getDriverActorContext();
  if (!driverContext) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
  }

  const ownsDelivery = await verifyDriverOwnsDelivery(driverContext.driverId, deliveryId);
  if (!ownsDelivery) {
    return errorResponse('FORBIDDEN', 'This delivery is not assigned to you', 403);
  }

  const validation = driverDeliveryProofSchema.safeParse(await request.json());
  if (!validation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validation.error.issues[0]?.message || 'Invalid delivery proof',
      400
    );
  }

  // Geofence signal: record how far the submitted proof location is from the
  // expected pickup/dropoff point. Recorded (not rejected) — GPS drift and
  // large premises make a hard geofence reject legitimate drivers, but ops
  // needs the discrepancy in the audit trail to dispute bad proofs.
  let distanceFromExpectedKm: number | null = null;
  if (validation.data.lat != null && validation.data.lng != null) {
    const deliveryRow = await getDeliveryById(createAdminClient(), deliveryId).catch(() => null);
    if (deliveryRow) {
      const expectedLat =
        validation.data.eventType === 'dropoff' ? deliveryRow.dropoff_lat : deliveryRow.pickup_lat;
      const expectedLng =
        validation.data.eventType === 'dropoff' ? deliveryRow.dropoff_lng : deliveryRow.pickup_lng;
      distanceFromExpectedKm = calculateDistanceKm(
        validation.data.lat,
        validation.data.lng,
        expectedLat,
        expectedLng
      );
    }
  }

  const engine = getEngine();
  const metadata = {
    proofUrl: validation.data.proofUrl,
    notes: validation.data.notes,
    lat: validation.data.lat,
    lng: validation.data.lng,
    signatureUrl: validation.data.signatureUrl,
    ...(distanceFromExpectedKm != null
      ? { distanceFromExpectedKm: Math.round(distanceFromExpectedKm * 1000) / 1000 }
      : {}),
  };

  const result =
    validation.data.eventType === 'dropoff'
      ? await engine.platform.completeDeliveredOrder(deliveryId, driverContext.actor, metadata)
      : await engine.dispatch.updateDeliveryStatus(
          deliveryId,
          'picked_up',
          driverContext.actor,
          metadata
        );

  if (!result.success) {
    return errorResponse(result.error!.code, result.error!.message);
  }

  return successResponse({ delivery: result.data });
}
