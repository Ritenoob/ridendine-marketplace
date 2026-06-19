import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  countStorefronts,
  getRawPlatformSettingsRow,
  type SupabaseClient,
} from '@ridendine/db';
import { finalizeOpsActor, getEngine, getOpsActorContext, guardPlatformApi } from '@/lib/engine';
import { maintenanceCommandSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'engine_maintenance');
  if (denied) return denied;

  const client = createAdminClient() as unknown as SupabaseClient;

  // Check if maintenance mode is active (stored in platform_settings)
  const settings = await getRawPlatformSettingsRow(client);

  // Count active storefronts
  const activeCount = await countStorefronts(client, { isActive: true, isPaused: false });
  const pausedCount = await countStorefronts(client, { isPaused: true });
  const totalCount = await countStorefronts(client);

  return NextResponse.json({
    success: true,
    data: {
      maintenanceMode: settings?.setting_value?.maintenance_mode === true,
      maintenanceMessage: settings?.setting_value?.maintenance_message || '',
      activatedAt: settings?.setting_value?.maintenance_activated_at || null,
      activatedBy: settings?.setting_value?.maintenance_activated_by || null,
      storefronts: { active: activeCount || 0, paused: pausedCount || 0, total: totalCount || 0 },
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'engine_maintenance'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, maintenanceCommandSchema);
  if (actionInput instanceof Response) return actionInput;
  const result = await getEngine().operations.execute(actionInput as OpsCommandInput, opsActor);
  return operationResultResponse(result);
}
