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
const mockGetChefByUserId = jest.fn();

jest.mock('@ridendine/db', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
  getChefByUserId: (...args: unknown[]) => mockGetChefByUserId(...args),
}));

import { POST } from '../route';

function request(body: Record<string, unknown>) {
  return new Request('https://chef.ridendine.ca/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('chef auth login route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true });
  });

  it('rate-limits login attempts before checking credentials', async () => {
    mockEvaluateRateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 60 });

    const response = await POST(request({ email: 'sean@ridendine.ca', password: 'password123' }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Too many login attempts');
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('allows an approved chef to sign in through the JSON API', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-chef', email: 'sean@ridendine.ca' },
        session: { access_token: 'token' },
      },
      error: null,
    });
    mockGetChefByUserId.mockResolvedValue({
      id: 'chef-1',
      status: 'approved',
    });

    const response = await POST(request({ email: 'sean@ridendine.ca', password: 'password123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.chef.id).toBe('chef-1');
    expect(body.data.session.access_token).toBe('token');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('signs out and rejects users without an approved chef profile', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-chef', email: 'pending.chef@ridendine.ca' },
        session: { access_token: 'token' },
      },
      error: null,
    });
    mockGetChefByUserId.mockResolvedValue({
      id: 'chef-pending',
      status: 'pending',
    });

    const response = await POST(
      request({ email: 'pending.chef@ridendine.ca', password: 'password123' })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Chef account is not approved yet');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
