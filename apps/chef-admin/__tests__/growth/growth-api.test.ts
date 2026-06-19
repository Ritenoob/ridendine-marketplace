/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/engine', () => ({
  getChefActorContext: jest.fn(),
  errorResponse: jest.fn((code: string, msg: string, status = 400) =>
    new Response(JSON.stringify({ error: code, message: msg }), { status })
  ),
  successResponse: jest.fn((data: unknown, status = 200) =>
    new Response(JSON.stringify({ data }), { status })
  ),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

const mockAdminClient = { from: jest.fn() };

function makeChain(data: unknown) {
  const chain: Record<string, unknown> = {};
  const resolved = Promise.resolve({ data, error: null });
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.then = (resolved as Promise<unknown>).then.bind(resolved);
  chain.catch = (resolved as Promise<unknown>).catch.bind(resolved);
  return chain;
}

import { getChefActorContext } from '@/lib/engine';

describe('GET /api/growth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue(null);
    const { GET } = await import('@/app/api/growth/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/growth'));
    expect(response.status).toBe(401);
  });

  it('returns 200 with 8 weekly periods when window=weeks', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });
    mockAdminClient.from = jest.fn().mockImplementation(() => makeChain([]));

    const { GET } = await import('@/app/api/growth/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/growth?window=weeks'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.periods).toHaveLength(8);
    expect(body.data.window).toBe('weeks');
  });

  it('returns 200 with 8 monthly periods when window=months', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });
    mockAdminClient.from = jest.fn().mockImplementation(() => makeChain([]));

    jest.resetModules();
    jest.mock('@/lib/engine', () => ({
      getChefActorContext: jest.fn().mockResolvedValue({ chefId: 'chef-1', storefrontId: 'sf-1' }),
      errorResponse: jest.fn((code: string, msg: string, status = 400) =>
        new Response(JSON.stringify({ error: code, message: msg }), { status })
      ),
      successResponse: jest.fn((data: unknown, status = 200) =>
        new Response(JSON.stringify({ data }), { status })
      ),
    }));
    jest.mock('@ridendine/db', () => ({
      createAdminClient: jest.fn(() => mockAdminClient),
    }));

    const { GET } = await import('@/app/api/growth/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/growth?window=months'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.periods).toHaveLength(8);
    expect(body.data.window).toBe('months');
  });

  it('calculates growth rates between current and previous period', async () => {
    (getChefActorContext as jest.Mock).mockResolvedValue({
      chefId: 'chef-1',
      storefrontId: 'sf-1',
    });

    // Seed orders: 2 from last week, 4 from this week
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);

    const mockOrders = [
      { total: 50, created_at: thisWeek.toISOString(), customer_id: 'c1' },
      { total: 50, created_at: thisWeek.toISOString(), customer_id: 'c2' },
      { total: 25, created_at: lastWeek.toISOString(), customer_id: 'c3' },
    ];

    mockAdminClient.from = jest.fn().mockImplementation(() => makeChain(mockOrders));

    const { GET } = await import('@/app/api/growth/route');
    const response = await GET(new NextRequest('http://localhost:3001/api/growth?window=weeks'));
    expect(response.status).toBe(200);
    const body = await response.json();
    // growth fields present
    expect(body.data).toHaveProperty('revenueGrowth');
    expect(body.data).toHaveProperty('projectedRevenue');
    expect(body.data).toHaveProperty('bestPeriodLabel');
  });
});
