import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateRateLimit, getRateLimitProviderStatus } from './index';
import { RATE_LIMIT_POLICIES } from './policies';

const BASE_ENV = { ...process.env };

describe('distributed-aware rate limits', () => {
  afterEach(() => {
    process.env = { ...BASE_ENV };
    vi.restoreAllMocks();
  });

  it('uses memory provider in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const status = getRateLimitProviderStatus();
    expect(status.provider).toBe('memory');
    expect(status.ready).toBe(true);
    expect(status.degraded).toBe(false);
  });

  it('marks production-like environment as degraded without distributed provider', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const status = getRateLimitProviderStatus();
    expect(status.provider).toBe('memory');
    expect(status.ready).toBe(false);
    expect(status.degraded).toBe(true);
  });

  it('falls back to in-memory limiter (with degraded flag) when provider missing in production', async () => {
    // Previously we hard-failed every high-risk request when Upstash was unset,
    // which blocked legitimate auth/checkout traffic in prod the moment the
    // distributed provider went down. New behavior: use the in-memory store as
    // a degraded fallback so requests still flow, and surface the gap via the
    // `degraded` flag on the response.
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const decision = await evaluateRateLimit({
      request: new Request('http://localhost/api/checkout'),
      policy: RATE_LIMIT_POLICIES.checkout,
      namespace: 'web',
      userId: 'customer-1',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.degraded).toBe(true);
    expect(decision.reason).toMatch(/Distributed rate-limit provider/);
  });

  it('allows low-risk fail-open policy during degraded mode', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const decision = await evaluateRateLimit({
      request: new Request('http://localhost/api/public'),
      policy: RATE_LIMIT_POLICIES.publicRead,
      namespace: 'web',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.degraded).toBe(true);
  });

  it('returns denied decision after exceeding limit in memory mode', async () => {
    process.env.NODE_ENV = 'development';
    const policy = {
      name: 'tight_test',
      maxRequests: 1,
      windowSeconds: 60,
      keyStrategy: 'ip' as const,
      failBehavior: 'fail_closed' as const,
      risk: 'high' as const,
    };

    const req = new Request('http://localhost/api/test');
    const first = await evaluateRateLimit({
      request: req,
      policy,
      namespace: 'test-tight',
      routeKey: 'POST:/api/test',
    });
    const second = await evaluateRateLimit({
      request: req,
      policy,
      namespace: 'test-tight',
      routeKey: 'POST:/api/test',
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.retryAfter).toBeGreaterThan(0);
  });
});
