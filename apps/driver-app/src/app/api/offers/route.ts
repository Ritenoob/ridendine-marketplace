// ==========================================
// DRIVER-APP DELIVERY OFFERS API
// Shows pending delivery offers for drivers
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getDriverActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

type OfferOrder = {
  order_number?: string | null;
  tip?: number | string | null;
  storefront?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type OfferDelivery = {
  id?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  distance_km?: number | string | null;
  route_to_dropoff_seconds?: number | string | null;
  driver_payout?: number | string | null;
  orders?: OfferOrder | OfferOrder[] | null;
};

type AssignmentOfferRow = {
  id?: string | null;
  delivery_id?: string | null;
  expires_at?: string | null;
  delivery?: OfferDelivery | OfferDelivery[] | null;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapOfferForDriver(row: AssignmentOfferRow) {
  const delivery = firstRelated(row.delivery);
  const order = firstRelated(delivery?.orders);
  const storefront = firstRelated(order?.storefront);

  return {
    attemptId: row.id ?? '',
    deliveryId: delivery?.id ?? row.delivery_id ?? '',
    pickupAddress: delivery?.pickup_address ?? '',
    dropoffAddress: delivery?.dropoff_address ?? '',
    estimatedDistanceKm: numericOrNull(delivery?.distance_km),
    estimatedRouteSeconds: numericOrNull(delivery?.route_to_dropoff_seconds),
    estimatedPayout: numericOrNull(delivery?.driver_payout),
    customerTip: numericOrNull(order?.tip),
    orderNumber: order?.order_number ?? null,
    storefrontName: storefront?.name ?? null,
    expiresAt: row.expires_at ?? '',
  };
}

/**
 * GET /api/offers
 * Get pending delivery offers for the current driver
 */
export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();

    // Get pending offers for this driver
    const { data: offers, error } = await adminClient
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
      .eq('driver_id', driverContext.driverId)
      .eq('response', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('offered_at', { ascending: false });

    if (error) {
      return errorResponse('FETCH_ERROR', error.message);
    }

    return successResponse({
      offers: (offers || []).map((offer) => mapOfferForDriver(offer as AssignmentOfferRow)),
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * POST /api/offers
 * Accept or decline an offer
 */
export async function POST(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const body = await request.json();
    const { action, attemptId, reason, driverId } = body;

    if (!attemptId) {
      return errorResponse('MISSING_ATTEMPT', 'Attempt ID is required');
    }

    const engine = getEngine();
    const { actor, driverId: sessionDriverId } = driverContext;
    const resolvedDriverId = typeof driverId === 'string' ? driverId : sessionDriverId;
    if (resolvedDriverId !== sessionDriverId) {
      return errorResponse('FORBIDDEN', 'Driver mismatch');
    }

    if (action === 'accept') {
      const result = await engine.dispatch.respondToOffer(
        attemptId,
        'accept',
        resolvedDriverId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    if (action === 'decline') {
      const result = await engine.dispatch.respondToOffer(
        attemptId,
        'decline',
        resolvedDriverId,
        actor,
        reason || 'Driver declined'
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ declined: true });
    }

    return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  } catch (error) {
    console.error('Error handling offer:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
