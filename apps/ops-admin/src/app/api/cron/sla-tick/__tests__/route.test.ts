/**
 * TDD: retired SLA tick cron route
 * Tests for GET/POST /api/cron/sla-tick
 */

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
}));

const mockProcessExpiredTimers = jest.fn();
jest.mock('@ridendine/engine', () => ({
  createCentralEngine: jest.fn(() => ({
    sla: { processExpiredTimers: mockProcessExpiredTimers },
  })),
}));

jest.mock('@ridendine/utils', () => ({
  validateEngineProcessorHeaders: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
    })),
  },
}));

import { GET, POST } from '../route';
import { NextResponse } from 'next/server';

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/cron/sla-tick', () => {
  it('returns 410 and points callers to the canonical SLA processor', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer dev-cron-secret' }));

    expect(res.status).toBe(410);
    expect(mockProcessExpiredTimers).not.toHaveBeenCalled();

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg).toMatchObject({
      success: false,
      code: 'DEPRECATED_CRON_ROUTE',
      replacement: '/api/engine/processors/sla',
    });
  });
});

describe('POST /api/cron/sla-tick', () => {
  it('returns 410 and does not run legacy SLA work', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer dev-cron-secret' }));

    expect(res.status).toBe(410);
    expect(mockProcessExpiredTimers).not.toHaveBeenCalled();
  });
});
