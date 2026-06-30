// ==========================================
// PARTNER API AUTH
// Resolves a presented key to a partner identity. Keys are DB-backed
// (api_partner_keys, stored as sha256 hashes), individually revocable, scoped,
// and carry a test_mode flag. A legacy env PARTNER_API_KEY is still accepted as
// a fallback during rollout (resolves to an anonymous, non-test context).
// ==========================================

import { createHash, timingSafeEqual } from 'crypto';
import {
  resolvePartnerByKeyHash,
  touchPartnerKey,
  type SupabaseClient,
} from '@ridendine/db';

export interface PartnerContext {
  /** null for the legacy env-key fallback (no per-partner identity). */
  partnerId: string | null;
  partnerName: string;
  testMode: boolean;
  scopes: string[];
  keyId: string | null;
  rateLimitPerMin: number;
}

function extractKey(request: Request): string {
  return (
    request.headers.get('x-api-key')?.trim() ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    ''
  );
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Resolve the partner behind a request, or null if unauthorized.
 * Tries the DB key table first (hash lookup), then the legacy env key.
 */
export async function resolvePartnerContext(
  request: Request,
  adminClient: SupabaseClient
): Promise<PartnerContext | null> {
  const provided = extractKey(request);
  if (!provided || provided.length < 16) return null;

  const hash = createHash('sha256').update(provided).digest('hex');
  const resolved = await resolvePartnerByKeyHash(adminClient, hash);
  if (resolved) {
    // Fire-and-forget usage stamp; never blocks the request.
    void touchPartnerKey(adminClient, resolved.keyId);
    return {
      partnerId: resolved.partnerId,
      partnerName: resolved.partnerName,
      testMode: resolved.testMode,
      scopes: resolved.scopes,
      keyId: resolved.keyId,
      rateLimitPerMin: resolved.rateLimitPerMin,
    };
  }

  // Legacy fallback: single shared env secret (fail-closed if unset/weak).
  const expected = process.env.PARTNER_API_KEY;
  if (expected && expected.length >= 16 && safeEqual(provided, expected)) {
    return {
      partnerId: null,
      partnerName: 'legacy-env-key',
      testMode: false,
      scopes: ['quote', 'checkout'],
      keyId: null,
      rateLimitPerMin: 120,
    };
  }

  return null;
}

/** Whether the resolved partner is permitted the given capability. */
export function partnerHasScope(ctx: PartnerContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}
