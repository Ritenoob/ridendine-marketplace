// ==========================================
// PARTNER REQUEST SIGNING (opt-in per key)
// When a key has require_signature = true, every request must carry:
//   X-RideNDine-Timestamp: <unix ms>
//   X-RideNDine-Signature: sha256=<hex>   where hex = HMAC-SHA256(
//       signing_secret, `${timestamp}.${rawBody}`)
// The timestamp must be within CLOCK_SKEW_MS (replay protection). Keys without
// require_signature skip all of this (bearer auth only).
// ==========================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { PartnerContext } from './auth';

const CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface SignatureCheck {
  ok: boolean;
  code?: string;
  message?: string;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify the request signature for a partner whose key requires it. `rawBody` is
 * the exact bytes the route read (must be hashed before JSON.parse). Returns
 * ok:true immediately when the key does not require signing.
 */
export function verifyPartnerSignature(
  partner: PartnerContext,
  rawBody: string,
  request: Request,
  nowMs: number
): SignatureCheck {
  if (!partner.requireSignature) return { ok: true };

  if (!partner.signingSecret) {
    // Misconfiguration: require_signature on but no secret -> fail closed.
    return { ok: false, code: 'SIGNATURE_CONFIG', message: 'Signing is required but no secret is configured' };
  }

  const ts = request.headers.get('X-RideNDine-Timestamp');
  const sig = request.headers.get('X-RideNDine-Signature');
  if (!ts || !sig) {
    return { ok: false, code: 'SIGNATURE_MISSING', message: 'Missing X-RideNDine-Timestamp / X-RideNDine-Signature' };
  }

  const tsMs = Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs(nowMs - tsMs) > CLOCK_SKEW_MS) {
    return { ok: false, code: 'SIGNATURE_STALE', message: 'Timestamp missing, malformed, or outside the allowed window' };
  }

  const expected = 'sha256=' + createHmac('sha256', partner.signingSecret).update(`${tsMs}.${rawBody}`).digest('hex');
  if (!safeEqual(sig.trim(), expected)) {
    return { ok: false, code: 'SIGNATURE_INVALID', message: 'Signature does not match' };
  }

  return { ok: true };
}
