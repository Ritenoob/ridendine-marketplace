/**
 * TDD: Analytics Trends API route
 * Tests for GET /api/analytics/trends
 */

// Mock dependencies before importing
jest.mock('@/lib/engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    getOpsActorContext: jest.fn(),
    guardPlatformApi: jest.fn((actor: unknown) =>
      actor
        ? null
        : NextResponse.json(
            {
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
            },
            { status: 401 }
          )
    ),
  };
});

const mockListOrderTrendRows = jest.fn();
const mockListChefPayableLedgerTotalsSince = jest.fn();
const mockListChefDisplayNames = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
  listOrderTrendRows: (...args: unknown[]) => mockListOrderTrendRows(...args),
  listChefPayableLedgerTotalsSince: (...args: unknown[]) =>
    mockListChefPayableLedgerTotalsSince(...args),
  listChefDisplayNames: (...args: unknown[]) => mockListChefDisplayNames(...args),
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init && init.status ? init.status : 200 })),
  },
}));

import { GET } from '../route';
import { getOpsActorContext } from '@/lib/engine';
import { NextResponse } from 'next/server';

function makeRequest(params = {}) {
  const url = new URL('http://localhost/api/analytics/trends');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return { url: url.toString() } as any;
}

function installRepositoryData({
  orders = [] as unknown[],
  ledger = [] as unknown[],
  chefNames = [] as unknown[],
} = {}) {
  mockListOrderTrendRows.mockResolvedValue(orders);
  mockListChefPayableLedgerTotalsSince.mockResolvedValue(ledger);
  mockListChefDisplayNames.mockResolvedValue(chefNames);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/analytics/trends', () => {
  it('returns 401 when actor is null', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('returns trend data with correct shape when authorized', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'ops_manager',
      entityId: 'e1',
      sessionId: 's1',
    });

    const orders = [
      { id: 'o1', total: 25.00, status: 'delivered', payment_status: 'completed', created_at: new Date().toISOString() },
      { id: 'o2', total: 15.00, status: 'cancelled', payment_status: 'pending', created_at: new Date().toISOString() },
    ];

    installRepositoryData({
      orders,
      ledger: [{ entity_id: 'chef1', amount_cents: 1000 }],
      chefNames: [{ id: 'chef1', display_name: 'Chef Alice' }],
    });

    await GET(makeRequest({ days: '7' }));

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.data).toHaveProperty('trend');
    expect(callArg.data).toHaveProperty('topChefs');
    expect(callArg.data).toHaveProperty('peakHours');
    expect(callArg.data).toHaveProperty('summary');
    expect(Array.isArray(callArg.data.trend)).toBe(true);
    expect(Array.isArray(callArg.data.peakHours)).toBe(true);
    expect(callArg.data.peakHours).toHaveLength(24);
    expect(callArg.data.topChefs).toEqual([{ name: 'Chef Alice', revenue: 10 }]);
  });

  it('fills in missing dates with zeros in trend array', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'ops_manager',
      entityId: 'e1',
      sessionId: 's1',
    });

    installRepositoryData();

    await GET(makeRequest({ days: '7' }));

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.data.trend.length).toBeGreaterThanOrEqual(7);
    const allZero = callArg.data.trend.every((d) => d.orders === 0 && d.revenue === 0);
    expect(allZero).toBe(true);
  });

  it('calculates summary totals correctly', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'ops_manager',
      entityId: 'e1',
      sessionId: 's1',
    });

    const today = new Date().toISOString();
    const orders = [
      { id: 'o1', total: 100, status: 'delivered', payment_status: 'completed', created_at: today },
      { id: 'o2', total: 50, status: 'completed', payment_status: 'completed', created_at: today },
      { id: 'o3', total: 30, status: 'cancelled', payment_status: 'pending', created_at: today },
    ];

    installRepositoryData({ orders });

    await GET(makeRequest({ days: '1' }));

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.data.summary.totalOrders).toBe(3);
    // revenue only from payment_status === 'completed'
    expect(callArg.data.summary.totalRevenue).toBe(150);
  });
});
