// ==========================================
// PER-PARTNER RATE LIMITING
// Enforces each partner's configured requests-per-minute ceiling, keyed on the
// partner id (so one partner can't exhaust another's headroom or hammer the API
// with a leaked key). Runs AFTER the route's pre-auth IP/composite limit.
// ==========================================

import {
  evaluateRateLimit,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import type { PartnerContext } from './auth';

/**
 * Returns a 429 Response if the partner is over their per-minute ceiling,
 * otherwise null (allowed).
 */
export async function enforcePartnerRateLimit(
  request: Request,
  partner: PartnerContext,
  routeKey: string
): Promise<Response | null> {
  const partnerKey = partner.partnerId ?? 'legacy-env';
  const decision = await evaluateRateLimit({
    request,
    policy: {
      name: 'partner_per_partner',
      maxRequests: partner.rateLimitPerMin,
      windowSeconds: 60,
      keyStrategy: 'user_id',
      failBehavior: 'fail_closed',
      risk: 'high',
    },
    namespace: `partner:${partnerKey}`,
    userId: partnerKey,
    routeKey,
  });
  return decision.allowed ? null : rateLimitPolicyResponse(decision);
}
