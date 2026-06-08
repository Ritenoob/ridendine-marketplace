import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  driverNotificationEvents,
  driverNotificationPreferencesPatchSchema,
  driverNotificationPreferencesSchema,
  type DriverNotificationPreferencesInput,
} from '@ridendine/validation';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type PreferenceRow = {
  preferences: unknown;
};

type QueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

function buildDefaultPreferences(): DriverNotificationPreferencesInput {
  return Object.fromEntries(
    driverNotificationEvents.map((event) => [event, { email: true, sms: true }])
  ) as DriverNotificationPreferencesInput;
}

function getPreferenceTable(client: unknown) {
  return (client as { from: (table: string) => unknown }).from('driver_notification_preferences') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<QueryResult<PreferenceRow>>;
      };
    };
    upsert: (
      values: Record<string, unknown>,
      options: { onConflict: string }
    ) => {
      select: (columns: string) => {
        single: () => Promise<QueryResult<PreferenceRow>>;
      };
    };
  };
}

export async function GET() {
  try {
    const driverContext = await getDriverActorContext({ requireApproved: false });
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const client = createAdminClient();
    const result = (await getPreferenceTable(client)
      .select('preferences')
      .eq('driver_id', driverContext.driverId)
      .maybeSingle()) as QueryResult<PreferenceRow>;

    if (result.error && result.error.code !== 'PGRST116') {
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

    const result = (await getPreferenceTable(createAdminClient())
      .upsert(
        {
          driver_id: driverContext.driverId,
          preferences: parsed.data.preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'driver_id' }
      )
      .select('preferences')
      .single()) as QueryResult<PreferenceRow>;

    if (result.error) {
      return errorResponse('PREFERENCES_SAVE_ERROR', result.error.message ?? 'Could not save preferences', 500);
    }

    return successResponse({ preferences: parsed.data.preferences });
  } catch (error) {
    console.error('[driver-app][notification-preferences][PATCH]', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
