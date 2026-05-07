/**
 * TDD: Platform Analytics API route
 * Tests for GET /api/analytics?period=today|week|month|year
 */

jest.mock('@/lib/engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    getOpsActorContext: jest.fn(),
    guardPlatformApi: jest.fn((actor: unknown) =>
      actor
        ? null
        : NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
            { status: 401 }
          )
    ),
  };
});

const mockFrom = jest.fn();
jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
      json: async () => data,
    })),
  },
}));

import { GET } from '../route';
import { getOpsActorContext } from '@/lib/engine';

function makeRequest(period = 'week') {
  const url = new URL(`http://localhost:3002/api/analytics?period=${period}`);
  return { url: url.toString() } as Parameters<typeof GET>[0];
}

function mockQueryChain(data: unknown, count?: number) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'gte', 'lte', 'lt', 'eq', 'in', 'not', 'order', 'limit', 'single'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.data = data;
  chain.count = count ?? null;
  chain.error = null;
  return chain;
}

describe('GET /api/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 200 with correct metrics shape', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ops' });

    const now = new Date().toISOString();
    const ordersChain = mockQueryChain([
      { id: 'o1', total: 2000, service_fee: 200, status: 'delivered', customer_id: 'c1', created_at: now },
      { id: 'o2', total: 1500, service_fee: 150, status: 'pending', customer_id: 'c2', created_at: now },
    ]);
    const emptyChain = mockQueryChain([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') return ordersChain;
      return emptyChain;
    });

    const res = await GET(makeRequest('week'));
    const json = res.data as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect(data).toHaveProperty('gmv');
    expect(data).toHaveProperty('totalOrders');
    expect(data).toHaveProperty('avgOrderValue');
    expect(data).toHaveProperty('platformRevenue');
    expect(data).toHaveProperty('ordersByStatus');
    expect(data).toHaveProperty('activeChefs');
    expect(data).toHaveProperty('activeDrivers');
    expect(data).toHaveProperty('uniqueCustomers');
  });

  it('returns period=today in response', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ops' });
    mockFrom.mockReturnValue(mockQueryChain([]));

    const res = await GET(makeRequest('today'));
    const json = res.data as { data: { period: string } };
    expect(json.data.period).toBe('today');
  });

  it('returns period=month in response', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ops' });
    mockFrom.mockReturnValue(mockQueryChain([]));

    const res = await GET(makeRequest('month'));
    const json = res.data as { data: { period: string } };
    expect(json.data.period).toBe('month');
  });

  it('falls back to week for invalid period', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ops' });
    mockFrom.mockReturnValue(mockQueryChain([]));

    const req = { url: 'http://localhost:3002/api/analytics?period=invalid' } as Parameters<typeof GET>[0];
    const res = await GET(req);
    const json = res.data as { data: { period: string } };
    expect(json.data.period).toBe('week');
  });

  it('calculates GMV and platform revenue correctly from cents', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ops' });

    const now = new Date().toISOString();
    const ordersChain = mockQueryChain([
      { id: 'o1', total: 2000, service_fee: 200, status: 'delivered', customer_id: 'c1', created_at: now },
      { id: 'o2', total: 3000, service_fee: 300, status: 'delivered', customer_id: 'c2', created_at: now },
    ]);
    const emptyChain = mockQueryChain([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') return ordersChain;
      return emptyChain;
    });

    const res = await GET(makeRequest('week'));
    const json = res.data as { data: { gmv: number; platformRevenue: number } };

    expect(json.data.gmv).toBe(5000);
    expect(json.data.platformRevenue).toBe(500);
  });
});
