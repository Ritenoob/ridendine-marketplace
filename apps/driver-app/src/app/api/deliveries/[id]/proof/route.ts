import type { NextRequest } from 'next/server';
import { driverDeliveryProofSchema } from '@ridendine/validation';
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

  const engine = getEngine();
  const metadata = {
    proofUrl: validation.data.proofUrl,
    notes: validation.data.notes,
    lat: validation.data.lat,
    lng: validation.data.lng,
    signatureUrl: validation.data.signatureUrl,
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
