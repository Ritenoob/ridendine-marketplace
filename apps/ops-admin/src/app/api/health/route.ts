import { createAdminClient, getOpsAdminHealthProbes, type SupabaseClient } from '@ridendine/db';
import {
  apiSuccess,
  getRateLimitProviderStatus,
  operationalHealthPayload,
} from '@ridendine/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const rateLimitStatus = getRateLimitProviderStatus();
  const probes = await getOpsAdminHealthProbes(adminClient);
  const envReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const payload = {
    ...operationalHealthPayload({
    service: 'ops-admin',
    dbReady: !probes.db.error,
    envReady,
    stripeReady: null,
    rateLimitReady: rateLimitStatus.ready,
    rateLimitProvider: rateLimitStatus.provider,
    rateLimitReason: rateLimitStatus.reason,
    }),
    checks: {
      supabase: { ready: !probes.db.error, error: probes.db.error },
      orders: { ready: !probes.orders.error, count: probes.orders.count ?? 0, error: probes.orders.error },
      deliveries: { ready: !probes.deliveries.error, count: probes.deliveries.count ?? 0, error: probes.deliveries.error },
      drivers: { ready: !probes.drivers.error, count: probes.drivers.count ?? 0, error: probes.drivers.error },
      chefs: { ready: !probes.chefs.error, count: probes.chefs.count ?? 0, error: probes.chefs.error },
      customers: { ready: !probes.customers.error, count: probes.customers.count ?? 0, error: probes.customers.error },
      driverPresence: { ready: !probes.driverPresence.error, count: probes.driverPresence.count ?? 0, error: probes.driverPresence.error },
    },
  };

  return apiSuccess(payload, payload.readiness === 'not_ready' ? 503 : 200);
}
