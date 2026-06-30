// ==========================================
// PARTNER STOREFRONT MENU PASSTHROUGH
// Same data as the public GET /api/storefronts/{id}/menu, behind the partner key.
// ==========================================

import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { errorResponse } from '@/lib/engine';
import { isAuthorizedPartner } from '@/lib/partner/auth';
import { GET as menuGet } from '@/app/api/storefronts/[id]/menu/route';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, ctx: RouteParams): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.publicRead,
    namespace: 'partner-storefront-menu',
    routeKey: 'GET:/api/partner/storefronts/[id]/menu',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  if (!isAuthorizedPartner(request)) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing partner API key', 401);
  }

  return menuGet(request, ctx);
}
