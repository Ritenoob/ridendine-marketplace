import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getDriverNotificationPreferencesRow,
  upsertDriverNotificationPreferencesRow,
  type DriverNotificationPreferencesQueryResult,
} from '@ridendine/db';
import {
  driverNotificationEvents,
  driverNotificationPreferencesPatchSchema,
  driverNotificationPreferencesSchema,
  type DriverNotificationPreferencesInput,
} from '@ridendine/validation';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

function isMissingPreferenceTableError(error: DriverNotificationPreferencesQueryResult<unknown>['error']) {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (message.includes('driver_notification_preferences') &&
      (message.includes('does not exist') || message.includes('schema cache')))
  );
}

function buildDefaultPreferences(): DriverNotificationPreferencesInput {
  return Object.fromEntries(
    driverNotificationEvents.map((event) => [event, { email: true, sms: true }])
  ) as DriverNotificationPreferencesInput;
}

export async function GET() {
  try {
    const driverContext = await getDriverActorContext({ requireApproved: false });
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const client = createAdminClient();
    const result = await getDriverNotificationPreferencesRow(client, driverContext.driverId);

    if (result.error && result.error.code !== 'PGRST116') {
      if (isMissingPreferenceTableError(result.error)) {
        return successResponse({
          preferences: buildDefaultPreferences(),
          source: 'default',
          persistence: 'unavailable',
        });
      }

      return errorResponse('PREFERENCES_QUERY_ERROR', result.error.message ?? 'Could not load preferences', 500);
    }

    if (!result.data) {
      return successResponse({ preferences: buildDefaultPreferences(), source: 'default' });
    }

    const parsed = driverNotificationPreferencesSchema.safeParse(result.data.preferences);
    if (!parsed.success) {
      return errorResponse('PREFERENCES_INVALID', 'Stored notification preferences are invalid', 500);
    }

    return successResponse({ preferences: parsed.data, source: 'database' });
  } catch (error) {
    console.error('[driver-app][notification-preferences][GET]', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext({ requireApproved: false });
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
    }

    const parsed = driverNotificationPreferencesPatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Preferences include unknown or invalid notification keys', 400);
    }

    const result = await upsertDriverNotificationPreferencesRow(createAdminClient(), {
      driverId: driverContext.driverId,
      preferences: parsed.data.preferences,
      updatedAt: new Date().toISOString(),
    });

    if (result.error) {
      return errorResponse('PREFERENCES_SAVE_ERROR', result.error.message ?? 'Could not save preferences', 500);
    }

    return successResponse({ preferences: parsed.data.preferences });
  } catch (error) {
    console.error('[driver-app][notification-preferences][PATCH]', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
