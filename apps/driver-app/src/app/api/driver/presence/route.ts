// ==========================================
// DRIVER-APP PRESENCE API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getActiveDeliveriesForDriver,
  getDriverPresence,
  upsertDriverPresence,
} from '@ridendine/db';
import { presencePatchSchema } from '@ridendine/validation';
import {
  getEngine,
  getDriverActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/driver/presence
 * Get current driver's presence status
 */
export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();

    let presence;
    try {
      presence = await getDriverPresence(adminClient, driverContext.driverId);
    } catch (error) {
      return errorResponse(
        'FETCH_ERROR',
        error instanceof Error ? error.message : 'Could not load driver presence'
      );
    }

    return successResponse({
      presence: presence || {
        driver_id: driverContext.driverId,
        status: 'offline',
        current_lat: null,
        current_lng: null,
        last_location_at: null,
      },
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * PATCH /api/driver/presence
 * Update driver's presence status (online/offline/busy)
 */
export async function PATCH(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
    }

    const parsed = presencePatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Status must be one of: online, offline, busy',
        400
      );
    }
    const { status } = parsed.data;

    const adminClient = createAdminClient();
    const engine = getEngine();

    let presence;
    try {
      presence = await upsertDriverPresence(adminClient, driverContext.driverId, { status });
    } catch (error) {
      return errorResponse(
        'UPDATE_ERROR',
        error instanceof Error ? error.message : 'Could not update driver presence'
      );
    }

    // Log status change via audit
    await engine.audit.log({
      action: 'status_change',
      entityType: 'driver',
      entityId: driverContext.driverId,
      actor: driverContext.actor,
      afterState: { status },
    });

    // Emit event for dispatch system
    engine.events.emit(
      'driver_status_changed',
      'driver',
      driverContext.driverId,
      { status },
      driverContext.actor
    );
    await engine.events.flush();

    // If going offline with active delivery, emit warning
    if (status === 'offline') {
      const activeDelivery = (await getActiveDeliveriesForDriver(
        adminClient,
        driverContext.driverId
      ))[0];

      if (activeDelivery) {
        // Create exception for ops to handle
        await engine.support.createException(
          {
            type: 'driver_issue',
            severity: 'medium',
            deliveryId: activeDelivery.id,
            driverId: driverContext.driverId,
            title: 'Driver Went Offline',
            description: 'Driver went offline with active delivery',
            recommendedActions: ['Reassign delivery', 'Contact driver'],
          },
          driverContext.actor
        );
      }
    }

    return successResponse({ presence });
  } catch (error) {
    console.error('Error updating presence:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
