import { NextResponse } from 'next/server';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { driverPatchSchema } from '@ridendine/validation';
import {
  finalizeOpsActor,
  getEngine,
  getOpsActorContext,
  errorResponse,
  guardPlatformApi,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'drivers_governance'));
    if (opsActor instanceof Response) return opsActor;

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.opsAdminMutation,
      namespace: 'ops-drivers-patch',
      userId: opsActor.userId,
      routeKey: 'PATCH:/api/drivers/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = driverPatchSchema.safeParse(await request.json());

    if (parsed.success) {
      const body = parsed.data;
      const engine = getEngine();
      const result = await engine.platform.updateDriverGovernance(
        id,
        body.status as Parameters<typeof engine.platform.updateDriverGovernance>[1],
        opsActor,
        body.reason
      );

      if (!result.success) {
        return errorResponse(
          result.error?.code || 'UPDATE_FAILED',
          result.error?.message || 'Failed to update driver',
          400
        );
      }

      return NextResponse.json({ data: result.data });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
