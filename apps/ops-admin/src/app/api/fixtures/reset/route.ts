import { NextResponse } from 'next/server';
import { createAdminClient, resetE2eOrderFixtures, type SupabaseClient } from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

function fixtureResetEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.E2E_FIXTURE_RESET_ENABLED === 'true'
  );
}

export async function POST() {
  if (!fixtureResetEnabled()) {
    return NextResponse.json(
      { success: false, code: 'FIXTURES_DISABLED', error: 'Fixture reset is disabled' },
      { status: 403 }
    );
  }

  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'team_manage');
  if (denied) return denied;

  const client = createAdminClient() as unknown as SupabaseClient;
  const testOrderNumbers = ['RD-E2E-LIFECYCLE'];

  const { orderIds } = await resetE2eOrderFixtures(client, testOrderNumbers);

  return NextResponse.json({
    success: true,
    data: {
      resetAt: new Date().toISOString(),
      removedOrders: orderIds.length,
      fixtureOrderNumbers: testOrderNumbers,
    },
  });
}
