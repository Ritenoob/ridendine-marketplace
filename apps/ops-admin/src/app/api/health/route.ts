import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  apiSuccess,
  getRateLimitProviderStatus,
  operationalHealthPayload,
} from '@ridendine/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const rateLimitStatus = getRateLimitProviderStatus();
  const [
    dbProbe,
    ordersProbe,
    deliveriesProbe,
    driversProbe,
    chefsProbe,
    customersProbe,
    presenceProbe,
  ] = await Promise.all([
    adminClient.from('orders').select('id').limit(1),
    adminClient.from('orders').select('id', { count: 'exact', head: true }),
    adminClient.from('deliveries').select('id', { count: 'exact', head: true }),
    adminClient.from('drivers').select('id', { count: 'exact', head: true }),
    adminClient.from('chef_profiles').select('id', { count: 'exact', head: true }),
    adminClient.from('customers').select('id', { count: 'exact', head: true }),
    adminClient.from('driver_presence').select('driver_id', { count: 'exact', head: true }),
  ]);
  const envReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const payload = {
    ...operationalHealthPayload({
    service: 'ops-admin',
    dbReady: !dbProbe.error,
    envReady,
    stripeReady: null,
    rateLimitReady: rateLimitStatus.ready,
    rateLimitProvider: rateLimitStatus.provider,
    rateLimitReason: rateLimitStatus.reason,
    }),
    checks: {
      supabase: { ready: !dbProbe.error, error: dbProbe.error?.message ?? null },
      orders: { ready: !ordersProbe.error, count: ordersProbe.count ?? 0, error: ordersProbe.error?.message ?? null },
      deliveries: { ready: !deliveriesProbe.error, count: deliveriesProbe.count ?? 0, error: deliveriesProbe.error?.message ?? null },
      drivers: { ready: !driversProbe.error, count: driversProbe.count ?? 0, error: driversProbe.error?.message ?? null },
      chefs: { ready: !chefsProbe.error, count: chefsProbe.count ?? 0, error: chefsProbe.error?.message ?? null },
      customers: { ready: !customersProbe.error, count: customersProbe.count ?? 0, error: customersProbe.error?.message ?? null },
      driverPresence: { ready: !presenceProbe.error, count: presenceProbe.count ?? 0, error: presenceProbe.error?.message ?? null },
    },
  };

  return apiSuccess(payload, payload.readiness === 'not_ready' ? 503 : 200);
}
