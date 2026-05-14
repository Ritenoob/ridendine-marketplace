import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import type { ActorContext } from '@ridendine/types';

export const dynamic = 'force-dynamic';

const SYSTEM_ACTOR: ActorContext = { userId: 'system', role: 'system' };

async function run(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = createAdminClient();
  const engine = createCentralEngine(client);
  const { warnings, breaches } = await engine.sla.processExpiredTimers(SYSTEM_ACTOR);

  // D.7 / A6 — Server-side auto-reject when a chef misses the chef_response
  // SLA. Previously the only auto-reject path was the 8-min client-side timer
  // in chef-admin orders-list.tsx, which silently failed if the chef closed
  // their tab. This handles that case for real: every minute the cron runs,
  // any chef_response timer past deadline triggers an engine-level rejection
  // (which also voids the customer's payment intent).
  const chefBreaches = breaches.filter((b) => b.type === 'chef_response');
  const autoRejected: Array<{ orderId: string; ok: boolean; error?: string }> = [];
  for (const timer of chefBreaches) {
    if (timer.entityType !== 'order') continue;
    try {
      const result = await engine.masterOrder.rejectOrder(
        timer.entityId,
        'chef_acceptance_timeout',
        'Auto-rejected: chef did not accept within the SLA window',
        SYSTEM_ACTOR
      );
      autoRejected.push({ orderId: timer.entityId, ok: result.success });
    } catch (err) {
      autoRejected.push({
        orderId: timer.entityId,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      warningsCount: warnings.length,
      breachesCount: breaches.length,
      autoRejectedCount: autoRejected.filter((r) => r.ok).length,
      autoRejectErrors: autoRejected.filter((r) => !r.ok),
      ts: new Date().toISOString(),
    },
  });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
