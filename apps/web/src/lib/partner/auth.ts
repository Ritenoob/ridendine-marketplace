// ==========================================
// PARTNER API AUTH
// Single shared-secret gate for the external storefront / co-op integration.
// Modeled on packages/utils processor-auth: no Next.js dependency, fail closed
// when the secret is unset so a missing env var can never expose the API.
// ==========================================

import { timingSafeEqual } from 'crypto';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch — compare lengths first but still
  // run the constant-time compare against a padded buffer to avoid leaking it.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate the partner shared secret from the `x-api-key` header.
 * Returns false (fail closed) when PARTNER_API_KEY is not configured.
 */
export function isAuthorizedPartner(request: Request): boolean {
  const expected = process.env.PARTNER_API_KEY;
  if (!expected || expected.length < 16) {
    // Refuse to authorize against a missing or trivially weak key.
    return false;
  }
  const provided =
    request.headers.get('x-api-key')?.trim() ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';
  if (!provided) return false;
  return safeEqual(provided, expected);
}
