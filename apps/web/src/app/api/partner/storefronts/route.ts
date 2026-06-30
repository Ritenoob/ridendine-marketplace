// ==========================================
// PARTNER STOREFRONTS PASSTHROUGH
// Same data as the public GET /api/storefronts, but behind the partner key so a
// co-op can browse merchants with the single key it uses for checkout.
// ==========================================

import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { errorResponse } from '@/lib/engine';
import { resolvePartnerContext } from '@/lib/partner/auth';
import { GET as storefrontsGet } from '@/app/api/storefronts/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.publicRead,
    namespace: 'partner-storefronts',
    routeKey: 'GET:/api/partner/storefronts',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const adminClient = createAdminClient() as unknown as SupabaseClient;
  if (!(await resolvePartnerContext(request, adminClient))) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing partner API key', 401);
  }

  return storefrontsGet(request);
}
