/**
 * @jest-environment node
 */

import { GET } from '../route';

const mockCheckSystemHealth = jest.fn();
const mockGetOpsActorContext = jest.fn();
const mockGuardPlatformApi = jest.fn();
const mockAdminClient = { __id: 'admin-client' } as unknown as Record<string, unknown>;

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

jest.mock('@ridendine/engine', () => ({
  checkSystemHealth: (...args: unknown[]) => mockCheckSystemHealth(...args),
}));

jest.mock('@/lib/engine', () => ({
  getOpsActorContext: () => mockGetOpsActorContext(),
  guardPlatformApi: (...args: unknown[]) => mockGuardPlatformApi(...args),
}));

function installProcessorRunsQuery(
  rows: Array<{ processor_name: string; finished_at: string | null; status: string }>,
) {
  // Builder shape used by route: from('ops_processor_runs').select(...).eq('status','completed').order(...).limit(N)
  // The terminal limit() returns a Promise resolving to { data, error }.
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
  (mockAdminClient as Record<string, unknown>).from = jest.fn((table: string) => {
    if (table === 'ops_processor_runs') return builder;
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
  });
  return builder;
}

describe('GET /api/engine/health readiness', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockGetOpsActorContext.mockResolvedValue({ actor: { role: 'super_admin' } });
    mockGuardPlatformApi.mockReturnValue(null);
    mockCheckSystemHealth.mockResolvedValue({
      overall: { status: 'up', timestamp: '2026-01-01T00:00:00.000Z', details: {} },
      components: {},
    });
    installProcessorRunsQuery([]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports missing processor secrets in readiness output', async () => {
    delete process.env.CRON_SECRET;
    delete process.env.ENGINE_PROCESSOR_TOKEN;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.readiness.env.CRON_SECRET).toEqual({ configured: false });
    expect(body.readiness.env.ENGINE_PROCESSOR_TOKEN).toEqual({ configured: false });
    expect(body.readiness.processorRoutes).toEqual(
      expect.objectContaining({
        sla: '/api/engine/processors/sla',
        expiredOffers: '/api/engine/processors/expired-offers',
      })
    );
  });

  it('reports lastSuccessAt per processor from ops_processor_runs', async () => {
    installProcessorRunsQuery([
      { processor_name: 'sla', finished_at: '2026-05-18T10:00:00.000Z', status: 'completed' },
      { processor_name: 'expired-offers', finished_at: '2026-05-18T09:59:00.000Z', status: 'completed' },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.readiness.processorRuns).toBeDefined();
    expect(body.readiness.processorRuns.sla.lastSuccessAt).toBe('2026-05-18T10:00:00.000Z');
    expect(body.readiness.processorRuns['expired-offers'].lastSuccessAt).toBe('2026-05-18T09:59:00.000Z');
  });

  it('reports lastSuccessAt as null when a processor has no completed runs', async () => {
    installProcessorRunsQuery([
      { processor_name: 'sla', finished_at: '2026-05-18T10:00:00.000Z', status: 'completed' },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.readiness.processorRuns.sla.lastSuccessAt).toBe('2026-05-18T10:00:00.000Z');
    expect(body.readiness.processorRuns['expired-offers'].lastSuccessAt).toBeNull();
  });
});
