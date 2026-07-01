// ==========================================
// DRIVER-APP DELIVERY API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getDriverDeliveryDetail,
  getPendingAssignmentAttemptForDriver,
  type SupabaseClient,
} from '@ridendine/db';
import { driverDeliveryPatchSchema } from '@ridendine/validation';
import {
  getEngine,
  getDriverActorContext,
  verifyDriverOwnsDelivery,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: deliveryId } = await params;

    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    // Verify driver owns this delivery
    const ownsDelivery = await verifyDriverOwnsDelivery(driverContext.driverId, deliveryId);
    if (!ownsDelivery) {
      return errorResponse('FORBIDDEN', 'This delivery is not assigned to you', 403);
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;

    const { data: delivery, error } = await getDriverDeliveryDetail(adminClient, deliveryId);

    if (error || !delivery) {
      return errorResponse('NOT_FOUND', 'Delivery not found', 404);
    }

    // Normalize kitchen address for driver display
    // Prefer the denormalized 'address' field; fall back to composing from parts
    const rawOrder = delivery.orders as any;
    if (rawOrder?.storefront?.kitchen) {
      const k = rawOrder.storefront.kitchen;
      if (!k.address && k.address_line1) {
        k.address = [
          k.address_line1,
          k.address_line2,
          k.city,
          k.state,
          k.postal_code,
        ].filter(Boolean).join(', ');
      }
    }

    // Get any active assignment attempt
    const { data: activeAttempt } = await getPendingAssignmentAttemptForDriver(
      adminClient,
      deliveryId,
      driverContext.driverId
    );

    return successResponse({
      delivery,
      activeAttempt,
    });
  } catch (error) {
    console.error('Error fetching delivery:', error instanceof Error ? error.message : 'unknown');
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: deliveryId } = await params;

    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const body = await request.json();
    const parsed = driverDeliveryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Invalid delivery payload',
        400
      );
    }
    const { action, status, proofUrl, notes, attemptId, reason } = parsed.data;

    const engine = getEngine();
    const { actor, driverId } = driverContext;

    // Handle assignment attempt responses (accept/decline offer)
    if (action === 'accept_offer') {
      if (!attemptId) {
        return errorResponse('MISSING_ATTEMPT', 'Attempt ID is required');
      }
      const result = await engine.dispatch.acceptOffer(attemptId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    if (action === 'decline_offer') {
      if (!attemptId) {
        return errorResponse('MISSING_ATTEMPT', 'Attempt ID is required');
      }
      const result = await engine.dispatch.declineOffer(
        attemptId,
        reason || 'Driver declined',
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ declined: true });
    }

    // For status updates, verify ownership
    const ownsDelivery = await verifyDriverOwnsDelivery(driverId, deliveryId);
    if (!ownsDelivery) {
      return errorResponse('FORBIDDEN', 'This delivery is not assigned to you', 403);
    }

    // Handle status updates
    if (action === 'update_status' || status) {
      const newStatus = status || parsed.data.newStatus;

      const validStatuses = [
        'en_route_to_pickup',
        'arrived_at_pickup',
        'picked_up',
        'en_route_to_dropoff',
        'arrived_at_dropoff',
        'delivered',
      ];

      if (!newStatus || !validStatuses.includes(newStatus)) {
        return errorResponse(
          'INVALID_STATUS',
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }

      const workflowResult = newStatus === 'delivered'
        ? await engine.platform.completeDeliveredOrder(deliveryId, actor, { proofUrl, notes })
        : await engine.dispatch.updateDeliveryStatus(
            deliveryId,
            newStatus,
            actor,
            { proofUrl, notes }
          );

      if (!workflowResult.success) {
        return errorResponse(workflowResult.error!.code, workflowResult.error!.message);
      }

      return successResponse(workflowResult.data);
    }

    return errorResponse('INVALID_ACTION', `Unknown action: ${action || 'none'}`);
  } catch (error) {
    console.error('Error updating delivery:', error instanceof Error ? error.message : 'unknown');
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
