import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getDriverById,
  updateDriver,
  type Driver,
  type SupabaseClient,
} from '@ridendine/db';
import { driverUpdateSchema } from '@ridendine/validation';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const driverContext = await getDriverActorContext({ requireApproved: false });
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();
    const driver = await getDriverById(adminClient as unknown as SupabaseClient, driverContext.driverId);

    if (!driver) {
      return errorResponse('NOT_FOUND', 'Driver profile not found', 404);
    }

    return successResponse({ driver });
  } catch (error) {
    console.error('Error fetching driver:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext({ requireApproved: false });
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const parsed = driverUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Invalid driver payload',
        400
      );
    }
    const { first_name, last_name, phone, profile_image_url } = parsed.data;
    // instant_payouts_enabled is not covered by driverUpdateSchema; read it
    // from the raw body as before.
    const { instant_payouts_enabled } = body;

    const updates: Partial<Driver> = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;
    if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url;

    const adminClient = createAdminClient();
    const patch = {
      ...updates,
      ...(instant_payouts_enabled !== undefined
        ? { instant_payouts_enabled: Boolean(instant_payouts_enabled) }
        : {}),
    };

    const updatedDriver = await updateDriver(
      adminClient as unknown as SupabaseClient,
      driverContext.driverId,
      patch as Parameters<typeof updateDriver>[2]
    );

    return successResponse({ driver: updatedDriver });
  } catch (error) {
    console.error('Error updating driver:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
