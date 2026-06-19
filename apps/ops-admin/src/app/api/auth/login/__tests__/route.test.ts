/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));

const mockEvaluateRateLimit = jest.fn();
const mockRateLimitPolicyResponse = jest.fn(
  () => new Response(JSON.stringify({ error: 'Too many login attempts' }), { status: 429 })
);

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { auth: { id: 'auth-policy' } },
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  rateLimitPolicyResponse: (...args: unknown[]) => mockRateLimitPolicyResponse(...args),
}));

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetActivePlatformUserByUserId = jest.fn();

jest.mock('@ridendine/db', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
  createAdminClient: jest.fn(() => ({})),
  getActivePlatformUserByUserId: (...args: unknown[]) =>
    mockGetActivePlatformUserByUserId(...args),
}));

import { POST } from '../route';

function request(body: Record<string, unknown>) {
  return new Request('https://ops.ridendine.ca/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('ops auth login route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true });
  });

  it('rate-limits login attempts before checking credentials', async () => {
    mockEvaluateRateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 60 });

    const response = await POST(request({ email: 'ops@ridendine.ca', password: 'password123' }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Too many login attempts');
    expect(mockEvaluateRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: { id: 'auth-policy' },
        namespace: 'ops-auth-login',
        routeKey: 'POST:/api/auth/login',
      })
    );
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('allows an active platform user to sign in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-ops', email: 'ops@ridendine.ca' } },
      error: null,
    });
    mockGetActivePlatformUserByUserId.mockResolvedValue({
      id: 'platform-1',
      role: 'super_admin',
    });

    const response = await POST(request({ email: 'ops@ridendine.ca', password: 'password123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('super_admin');
    expect(mockGetActivePlatformUserByUserId).toHaveBeenCalledWith(expect.anything(), 'user-ops');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
