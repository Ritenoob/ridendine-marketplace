// ==========================================
// AUTH MIDDLEWARE TESTS
// Tests for createAuthMiddleware factory
// ==========================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock next/server — hoisted before any imports
vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn((_opts?: unknown) => ({ type: 'next' })),
    redirect: vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
  };
  return { NextResponse };
});

// Mock @supabase/ssr — default: no authenticated user
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => makeSupabaseClient(null)),
}));

// Import mocked modules at module scope so the same instances are used throughout
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAuthMiddleware } from './middleware';

function makeSupabaseClient(user: unknown) {
  return {
    auth: {
      // getUser is the server-verified call the middleware must rely on
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      // getSession is intentionally still present but must NOT drive auth decisions
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
      }),
    },
  };
}

function createMockRequest(pathname: string) {
  const url = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
    },
  } as any;
}

describe('createAuthMiddleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default: no authenticated user
    vi.mocked(createServerClient).mockImplementation(() => makeSupabaseClient(null) as any);
    process.env = { ...originalEnv };
    delete process.env.ALLOW_DEV_AUTOLOGIN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ---- ALLOW_DEV_AUTOLOGIN guard ----

  it('skips auth checks in development when ALLOW_DEV_AUTOLOGIN=true', async () => {
    process.env.ALLOW_DEV_AUTOLOGIN = 'true';
    process.env.NODE_ENV = 'development';

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);
    expect((result as any).type).toBe('next');
  });

  it('does not skip auth in production even when ALLOW_DEV_AUTOLOGIN=true', async () => {
    process.env.ALLOW_DEV_AUTOLOGIN = 'true';
    process.env.NODE_ENV = 'production';

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    // In production with no session, should redirect to login
    const request = createMockRequest('/dashboard');
    const result = await middleware(request);
    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
  });

  it('does not skip auth when ALLOW_DEV_AUTOLOGIN is not set', async () => {
    delete process.env.ALLOW_DEV_AUTOLOGIN;
    process.env.NODE_ENV = 'development';

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);
    // Should redirect because there's no session
    expect((result as any).type).toBe('redirect');
  });

  // ---- Regression: BYPASS_AUTH must not be used ----

  it('regression: middleware source does not reference BYPASS_AUTH', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(dir, 'middleware.ts'), 'utf-8');
    expect(source).not.toContain('BYPASS_AUTH');
  });

  // ---- Public routes ----

  it('allows public routes without session — does not redirect to login', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/auth/login');
    const result = await middleware(request);

    // Must not be a redirect to the login route
    expect(result).toBeDefined();
    if ((result as any).type === 'redirect') {
      expect((result as any).url).not.toContain('/auth/login');
    }
  });

  it('allows a nested public route path without redirect', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/auth/signup');
    const result = await middleware(request);

    expect(result).toBeDefined();
    if ((result as any).type === 'redirect') {
      expect((result as any).url).not.toContain('/auth/login');
    }
  });

  // ---- Protected routes (default protection mode) ----

  it('redirects unauthenticated user accessing protected route to login', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('adds redirect query param when bouncing unauthenticated user', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/orders/123');
    const result = await middleware(request);

    const resultUrl = (result as any).url as string;
    expect(resultUrl).toContain('redirect=');
    // Pathname is URL-encoded in the query string
    expect(decodeURIComponent(resultUrl)).toContain('/orders/123');
  });

  // ---- Auth routes — authenticated users redirected away ----

  it('redirects authenticated user away from auth routes to authenticatedRedirect', async () => {
    // Set up a verified user for this test
    vi.mocked(createServerClient).mockImplementation(
      () => makeSupabaseClient({ id: 'user-abc' }) as any
    );

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      authRoutes: ['/auth'],
      authenticatedRedirect: '/dashboard',
    });

    const request = createMockRequest('/auth/login');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/dashboard');
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('does not redirect authenticated users away from public API auth routes by default', async () => {
    vi.mocked(createServerClient).mockImplementation(
      () => makeSupabaseClient({ id: 'user-abc' }) as any
    );

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login', '/api/auth/login'],
      loginRoute: '/auth/login',
      authenticatedRedirect: '/',
    });

    const request = createMockRequest('/api/auth/login');
    const result = await middleware(request);

    expect((result as any).type).toBe('next');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  // ---- Server-side verification (getUser, not getSession) ----

  it('redirects when getUser returns no user even if a (spoofable) session cookie decodes', async () => {
    // Simulate a forged cookie: getSession decodes a session locally,
    // but server-side verification (getUser) rejects it.
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'forged' } } } }),
      },
    };
    vi.mocked(createServerClient).mockImplementation(() => client as any);

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
    expect(client.auth.getUser).toHaveBeenCalled();
  });

  it('uses supabase.auth.getUser for the protect decision on protected routes', async () => {
    const client = makeSupabaseClient({ id: 'user-abc' });
    vi.mocked(createServerClient).mockImplementation(() => client as any);

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);

    // Verified user → allowed through
    expect((result as any).type).toBe('next');
    expect(client.auth.getUser).toHaveBeenCalled();
    // The decision must not be based on the locally-decoded session
    expect(client.auth.getSession).not.toHaveBeenCalled();
  });

  // ---- Selective protection mode (protectedRoutes) ----

  it('allows unauthenticated user on non-protected route in selective mode', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      protectedRoutes: ['/account', '/orders'],
    });

    // '/' is not in protectedRoutes — should pass through without redirect
    const request = createMockRequest('/');
    const result = await middleware(request);

    expect((result as any).type).not.toBe('redirect');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated user on protected route in selective mode', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      protectedRoutes: ['/account', '/orders'],
    });

    const request = createMockRequest('/account/settings');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
  });
});
