import type { SupabaseClient } from '../client/types';

// ==========================================
// PARTNER API KEY REPOSITORY
// DB-backed, individually-revocable keys for the external storefront payment
// API. Keys are stored as sha256 hashes; the plaintext key never touches the DB.
// (Tables api_partners / api_partner_keys are not in the generated types yet —
//  use admin-client casts, consistent with platform_users access elsewhere.)
// ==========================================

export interface ResolvedPartner {
  partnerId: string;
  partnerName: string;
  testMode: boolean;
  scopes: string[];
  keyId: string;
  rateLimitPerMin: number;
  requireSignature: boolean;
  signingSecret: string | null;
}

/**
 * Resolve an active partner from the sha256 hash of a presented key.
 * Returns null when the key is unknown, revoked, inactive, or its partner is
 * inactive. O(1) — indexed lookup on key_hash, no per-key iteration.
 */
export async function resolvePartnerByKeyHash(
  client: SupabaseClient,
  keyHash: string
): Promise<ResolvedPartner | null> {
  const { data, error } = await (client as any)
    .from('api_partner_keys')
    .select('id, scopes, is_active, revoked_at, require_signature, signing_secret, api_partners!inner(id, name, is_active, test_mode, rate_limit_per_min)')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !data) return null;
  const partner = (data as any).api_partners;
  if (!partner || partner.is_active === false) return null;

  const rateLimit = Number(partner.rate_limit_per_min);
  return {
    partnerId: partner.id as string,
    partnerName: partner.name as string,
    testMode: !!partner.test_mode,
    scopes: Array.isArray((data as any).scopes) ? ((data as any).scopes as string[]) : ['quote', 'checkout'],
    keyId: (data as any).id as string,
    rateLimitPerMin: Number.isFinite(rateLimit) && rateLimit > 0 ? rateLimit : 120,
    requireSignature: !!(data as any).require_signature,
    signingSecret: ((data as any).signing_secret as string) ?? null,
  };
}

/** Best-effort last-used stamp for observability; never throws to callers. */
export async function touchPartnerKey(client: SupabaseClient, keyId: string): Promise<void> {
  try {
    await (client as any)
      .from('api_partner_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  } catch {
    /* non-critical */
  }
}
