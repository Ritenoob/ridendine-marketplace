/**
 * @jest-environment node
 */

import { isAuthorizedPartner } from '../auth';

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/partner/checkout', {
    method: 'POST',
    headers,
  });
}

describe('isAuthorizedPartner', () => {
  const ORIGINAL = process.env.PARTNER_API_KEY;
  const KEY = 'a'.repeat(40);

  afterEach(() => {
    process.env.PARTNER_API_KEY = ORIGINAL;
  });

  it('fails closed when PARTNER_API_KEY is unset', () => {
    delete process.env.PARTNER_API_KEY;
    expect(isAuthorizedPartner(reqWith({ 'x-api-key': KEY }))).toBe(false);
  });

  it('fails closed when configured key is too weak (<16 chars)', () => {
    process.env.PARTNER_API_KEY = 'short';
    expect(isAuthorizedPartner(reqWith({ 'x-api-key': 'short' }))).toBe(false);
  });

  it('rejects a missing key header', () => {
    process.env.PARTNER_API_KEY = KEY;
    expect(isAuthorizedPartner(reqWith({}))).toBe(false);
  });

  it('rejects a wrong key', () => {
    process.env.PARTNER_API_KEY = KEY;
    expect(isAuthorizedPartner(reqWith({ 'x-api-key': 'b'.repeat(40) }))).toBe(false);
  });

  it('rejects a key of different length', () => {
    process.env.PARTNER_API_KEY = KEY;
    expect(isAuthorizedPartner(reqWith({ 'x-api-key': 'a'.repeat(39) }))).toBe(false);
  });

  it('accepts the correct key via x-api-key', () => {
    process.env.PARTNER_API_KEY = KEY;
    expect(isAuthorizedPartner(reqWith({ 'x-api-key': KEY }))).toBe(true);
  });

  it('accepts the correct key via Authorization: Bearer', () => {
    process.env.PARTNER_API_KEY = KEY;
    expect(isAuthorizedPartner(reqWith({ authorization: `Bearer ${KEY}` }))).toBe(true);
  });
});
