import { NextResponse } from 'next/server';
import {
  createAdminClient,
  listCompletedProcessorRuns,
  type SupabaseClient,
} from '@ridendine/db';
import { checkSystemHealth } from '@ridendine/engine';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const TRACKED_PROCESSORS = [
  'sla',
  'expired-offers',
  'payouts-chef-preview',
  'payouts-driver-preview',
  'reconciliation-daily',
] as const;

function envReadiness() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'CRON_SECRET',
    'ENGINE_PROCESSOR_TOKEN',
  ];

  return Object.fromEntries(
    required.map((key) => [key, { configured: Boolean(process.env[key]) }])
  );
}

async function processorRunsReadiness(
  client: SupabaseClient,
): Promise<Record<string, { lastSuccessAt: string | null }>> {
  const initial: Record<string, { lastSuccessAt: string | null }> = {};
  for (const name of TRACKED_PROCESSORS) {
    initial[name] = { lastSuccessAt: null };
  }

  try {
    const data = await listCompletedProcessorRuns(client, 50);
    if (!Array.isArray(data)) return initial;

    for (const row of data) {
      const slot = initial[row.processor_name];
      if (!slot) continue;
      if (slot.lastSuccessAt === null && row.finished_at) {
        slot.lastSuccessAt = row.finished_at;
      }
    }
    return initial;
  } catch {
    return initial;
  }
}

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'engine_health');
  if (denied) return denied;

  try {
    const client = createAdminClient();
    const [health, processorRuns] = await Promise.all([
      checkSystemHealth(client as any),
      processorRunsReadiness(client as unknown as SupabaseClient),
    ]);
    const readiness = {
      env: envReadiness(),
      processorRoutes: {
        sla: '/api/engine/processors/sla',
        expiredOffers: '/api/engine/processors/expired-offers',
        payoutChefPreview: '/api/cron/payouts-chef-preview',
        payoutDriverPreview: '/api/cron/payouts-driver-preview',
        reconciliationDaily: '/api/cron/reconciliation-daily',
      },
      processorRuns,
    };
    const statusCode = health.overall.status === 'down' ? 503 : 200;
    return NextResponse.json({ ...health, readiness }, { status: statusCode });
  } catch {
    return NextResponse.json(
      {
        overall: {
          status: 'down',
          timestamp: new Date().toISOString(),
          details: { error: 'Health check failed' },
        },
        components: {},
      },
      { status: 503 },
    );
  }
}
