import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
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

  const client = createAdminClient() as any;
  const testOrderNumbers = ['RD-E2E-LIFECYCLE'];

  const { data: orders } = await client
    .from('orders')
    .select('id')
    .in('order_number', testOrderNumbers);
  const orderIds = (orders ?? []).map((order: { id: string }) => order.id);

  if (orderIds.length > 0) {
    await client.from('order_exceptions').delete().in('order_id', orderIds);
    await client.from('deliveries').delete().in('order_id', orderIds);
    await client.from('ledger_entries').delete().in('order_id', orderIds);
    await client.from('order_status_history').delete().in('order_id', orderIds);
    await client.from('order_items').delete().in('order_id', orderIds);
    await client.from('orders').delete().in('id', orderIds);
  }

  return NextResponse.json({
    success: true,
    data: {
      resetAt: new Date().toISOString(),
      removedOrders: orderIds.length,
      fixtureOrderNumbers: testOrderNumbers,
    },
  });
}
