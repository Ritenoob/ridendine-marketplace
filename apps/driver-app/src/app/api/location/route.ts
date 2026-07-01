// ==========================================
// DRIVER-APP LOCATION API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getDeliveryContextForDriverLocation,
  getDeliveryEtaSnapshotForDriverLocation,
  getDeliveryOwnerForDriverLocation,
  getOrderPublicStageForDriverLocation,
  insertDeliveryTrackingLocation,
  insertDriverLocation,
  upsertDriverCurrentLocation,
} from '@ridendine/db';
import { locationUpdateSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  isPlausibleClientIsoTime,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getDriverActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

const RATE_STORE = 'driver-location-post';

const ACTIVE_DELIVERY = new Set([
  'assigned',
  'en_route_to_pickup',
  'arrived_at_pickup',
  'picked_up',
  'en_route_to_dropoff',
  'arrived_at_dropoff',
]);

const CUSTOMER_LEG = new Set(['picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff']);

function rateLimitedResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many location updates; try again shortly',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfter)),
      },
    }
  );
}

/**
 * POST /api/location
 * Update driver's current location
 */
export async function POST(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      const unauthRl = await evaluateRateLimit({
        request,
        policy: RATE_LIMIT_POLICIES.auth,
        namespace: `${RATE_STORE}-unauth`,
        routeKey: 'POST:/api/location',
      });
      if (!unauthRl.allowed) {
        return rateLimitPolicyResponse(unauthRl);
      }
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const { driverId } = driverContext;

    const rl = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.driverLocation,
      namespace: RATE_STORE,
      driverId,
      routeKey: 'POST:/api/location',
    });
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter ?? 60);
    }

    const rawBody = (await request.json()) as Record<string, unknown>;
    if (rawBody.recordedAt != null) {
      if (
        typeof rawBody.recordedAt !== 'string' ||
        !isPlausibleClientIsoTime(rawBody.recordedAt)
      ) {
        return errorResponse(
          'INVALID_TIMESTAMP',
          'recordedAt must be a valid ISO time within acceptable clock skew',
          400
        );
      }
    }

    const validationResult = locationUpdateSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const { lat, lng, accuracy, heading, speed, deliveryId } = validationResult.data;

    if (lat === 0 && lng === 0) {
      return errorResponse(
        'INVALID_COORDINATES',
        'Coordinates (0,0) are not accepted',
        400
      );
    }

    const adminClient = createAdminClient();

    if (deliveryId) {
      const { data: dCheck, error: dErr } = await getDeliveryOwnerForDriverLocation(
        adminClient,
        deliveryId
      );

      if (dErr || !dCheck || dCheck.driver_id !== driverId) {
        return errorResponse('FORBIDDEN', 'Delivery is not assigned to this driver', 403);
      }
    }

    const engine = getEngine();

    const locationTimestamp = new Date().toISOString();
    await upsertDriverCurrentLocation(adminClient, {
      driverId,
      lat,
      lng,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      recordedAt: locationTimestamp,
    });
    await insertDriverLocation(adminClient, {
      driverId,
      lat,
      lng,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      recordedAt: locationTimestamp,
    });

    if (deliveryId) {
      const { data: delivery } = await getDeliveryContextForDriverLocation(adminClient, deliveryId);

      if (delivery && delivery.driver_id === driverId) {
        const deliveryStatus = delivery.status ?? '';
        if (ACTIVE_DELIVERY.has(deliveryStatus)) {
          await insertDeliveryTrackingLocation(adminClient, {
            deliveryId,
            driverId,
            lat,
            lng,
            accuracy: accuracy ?? null,
            recordedAt: locationTimestamp,
          });
        }

        if (delivery.order_id && CUSTOMER_LEG.has(deliveryStatus)) {
          const refreshed = await engine.eta.refreshFromDriverPing(deliveryId, { lat, lng });
          const orderId = delivery.order_id;

          const { data: snapRaw, error: snapError } =
            await getDeliveryEtaSnapshotForDriverLocation(adminClient, deliveryId);
          const { data: ordRaw, error: ordError } =
            await getOrderPublicStageForDriverLocation(adminClient, orderId);

          // Stale-data guard: only broadcast the ETA enrichment when the
          // refresh queries actually returned rows. On a query error or a
          // missing row the fallback values ('on_the_way' / null) would
          // overwrite fresher data on the customer side, so skip the
          // enrichment broadcast entirely. The location ping itself has
          // already been persisted above.
          if (!snapError && snapRaw && !ordError && ordRaw) {
            await engine.events.broadcastPublic(orderId, {
              public_stage: ordRaw.public_stage ?? 'on_the_way',
              eta_pickup_at: snapRaw.eta_pickup_at ?? null,
              eta_dropoff_at: refreshed.etaDropoffAt.toISOString(),
              route_progress_pct: refreshed.progressPct,
              route_remaining_seconds: refreshed.remainingSeconds,
              route_to_dropoff_polyline: snapRaw.route_to_dropoff_polyline ?? null,
            });
          } else {
            console.error(
              'Skipping ETA broadcast: stale delivery/order snapshot',
              snapError?.message ?? ordError?.message ?? 'row missing'
            );
          }
        }
      }
    }

    return successResponse({
      recordedAt: locationTimestamp,
    });
  } catch (error) {
    console.error('Error updating location:', error instanceof Error ? error.message : 'unknown');
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
