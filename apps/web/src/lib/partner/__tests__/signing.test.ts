/**
 * @jest-environment node
 */

import { createHmac } from 'crypto';
import { verifyPartnerSignature } from '../signing';
import type { PartnerContext } from '../auth';

const NOW = 1_700_000_000_000;
const SECRET = 'whsec_test_signing_secret';
const BODY = '{"hello":"world"}';

function partner(overrides: Partial<PartnerContext> = {}): PartnerContext {
  return {
    partnerId: 'p1', partnerName: 'X', testMode: false, scopes: ['quote'],
    keyId: 'k1', rateLimitPerMin: 120, requireSignature: true, signingSecret: SECRET,
    ...overrides,
  };
}

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/partner/checkout', { method: 'POST', headers });
}

function sign(ts: number, body: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
}

describe('verifyPartnerSignature', () => {
  it('passes immediately when the key does not require signing', () => {
    expect(verifyPartnerSignature(partner({ requireSignature: false }), BODY, reqWith({}), NOW).ok).toBe(true);
  });

  it('fails when require_signature is on but no secret is configured', () => {
    const r = verifyPartnerSignature(partner({ signingSecret: null }), BODY, reqWith({}), NOW);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SIGNATURE_CONFIG');
  });

  it('rejects a missing signature/timestamp', () => {
    const r = verifyPartnerSignature(partner(), BODY, reqWith({}), NOW);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SIGNATURE_MISSING');
  });

  it('rejects a stale timestamp (replay protection)', () => {
    const stale = NOW - 10 * 60 * 1000;
    const r = verifyPartnerSignature(
      partner(), BODY,
      reqWith({ 'X-RideNDine-Timestamp': String(stale), 'X-RideNDine-Signature': sign(stale, BODY) }),
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SIGNATURE_STALE');
  });

  it('rejects a wrong signature', () => {
    const r = verifyPartnerSignature(
      partner(), BODY,
      reqWith({ 'X-RideNDine-Timestamp': String(NOW), 'X-RideNDine-Signature': sign(NOW, BODY, 'wrong-secret') }),
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SIGNATURE_INVALID');
  });

  it('accepts a valid, fresh signature over timestamp + body', () => {
    const r = verifyPartnerSignature(
      partner(), BODY,
      reqWith({ 'X-RideNDine-Timestamp': String(NOW), 'X-RideNDine-Signature': sign(NOW, BODY) }),
      NOW
    );
    expect(r.ok).toBe(true);
  });

  it('is body-sensitive (signature for a different body fails)', () => {
    const r = verifyPartnerSignature(
      partner(), '{"tampered":true}',
      reqWith({ 'X-RideNDine-Timestamp': String(NOW), 'X-RideNDine-Signature': sign(NOW, BODY) }),
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SIGNATURE_INVALID');
  });
});
