import { createAdminClient } from '@ridendine/db';
import { getOpsDriverOperationsSummary } from '@/lib/driver-operations';
import {
  errorResponse,
  getOpsActorContext,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'ops_entity_read');
    if (denied) return denied;

    const { id } = await params;
    const summary = await getOpsDriverOperationsSummary(createAdminClient(), id);

    if (!summary) {
      return errorResponse('DRIVER_NOT_FOUND', 'Driver not found', 404);
    }

    return successResponse(summary);
  } catch (error) {
    return errorResponse(
      'DRIVER_OPERATIONS_FAILED',
      error instanceof Error ? error.message : 'Failed to load driver operations',
      500
    );
  }
}

