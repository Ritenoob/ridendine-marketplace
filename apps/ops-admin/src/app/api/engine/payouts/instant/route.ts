import {
  createAdminClient,
  listInstantPayoutRequests,
  type SupabaseClient,
} from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi, successResponse, finalizeOpsActor } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  const client = createAdminClient() as unknown as SupabaseClient;
  try {
    const queue = await listInstantPayoutRequests(client, 100);
    return successResponse({ queue });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load queue' },
      { status: 500 }
    );
  }
}
