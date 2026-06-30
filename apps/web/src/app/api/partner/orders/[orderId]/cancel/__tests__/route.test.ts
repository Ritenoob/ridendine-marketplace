/**
 * @jest-environment node
 */

import { POST } from '../route';

const mockEvaluateRateLimit = jest.fn();
const mockResolvePartner = jest.fn();
const mockEnforcePartnerRl = jest.fn();
const mockCancelOrder = jest.fn();
const mockOrderRow = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: mockOrderRow() }) }),
      }),
    }),
  }),
}));

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { partnerCheckout: { name: 'partner_checkout' } },
  evaluateRateLimit: (...a: unknown[]) => mockEvaluateRateLimit(...a),
  rateLimitPolicyResponse: () => Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
}));

jest.mock('@/lib/engine', () => ({
  getEngine: () => ({ masterOrder: { cancelOrder: (...a: unknown[]) => mockCancelOrder(...a) } }),
  getSystemActor: () => ({ userId: 'system', role: 'system' }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
  successResponse: (data: unknown, status = 200) => Response.json({ success: true, data }, { status }),
}));

jest.mock('@/lib/partner/auth', () => ({
  resolvePartnerContext: (...a: unknown[]) => mockResolvePartner(...a),
  partnerHasScope: (ctx: { scopes: string[] }, scope: string) => ctx.scopes.includes(scope),
}));

jest.mock('@/lib/partner/rate-limit', () => ({
  enforcePartnerRateLimit: (...a: unknown[]) => mockEnforcePartnerRl(...a),
}));

function req() {
  return new Request('http://localhost/api/partner/orders/o-1/cancel', {
    method: 'POST',
    headers: { 'x-api-key': 'k' },
  });
}
const ctx = { params: Promise.resolve({ orderId: 'o-1' }) };

describe('POST /api/partner/orders/[orderId]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true });
    mockEnforcePartnerRl.mockResolvedValue(null);
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p1', partnerName: 'Hoang Gia Pho', testMode: false,
      scopes: ['quote', 'checkout', 'cancel'], keyId: 'k1', rateLimitPerMin: 120,
    });
    mockOrderRow.mockReturnValue({ id: 'o-1', partner_id: 'p1', engine_status: 'pending' });
    mockCancelOrder.mockResolvedValue({ success: true, order: { engine_status: 'cancelled' } });
  });

  it('rejects an invalid key (401)', async () => {
    mockResolvePartner.mockResolvedValue(null);
    expect((await POST(req(), ctx)).status).toBe(401);
  });

  it('rejects a key without the cancel scope (403)', async () => {
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p1', partnerName: 'X', testMode: false, scopes: ['quote', 'checkout'], keyId: 'k1', rateLimitPerMin: 120,
    });
    const res = await POST(req(), ctx);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('FORBIDDEN_SCOPE');
  });

  it("returns 404 when the order belongs to a different partner", async () => {
    mockOrderRow.mockReturnValue({ id: 'o-1', partner_id: 'other-partner', engine_status: 'pending' });
    const res = await POST(req(), ctx);
    expect(res.status).toBe(404);
    expect(mockCancelOrder).not.toHaveBeenCalled();
  });

  it('returns 400 when the order is past the cancellable window', async () => {
    mockOrderRow.mockReturnValue({ id: 'o-1', partner_id: 'p1', engine_status: 'accepted' });
    const res = await POST(req(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('CANCEL_NOT_ALLOWED');
    expect(mockCancelOrder).not.toHaveBeenCalled();
  });

  it('cancels a pending order belonging to the partner', async () => {
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(mockCancelOrder).toHaveBeenCalledTimes(1);
    expect(mockCancelOrder.mock.calls[0][0]).toMatchObject({ orderId: 'o-1', reason: 'partner_requested' });
  });
});
