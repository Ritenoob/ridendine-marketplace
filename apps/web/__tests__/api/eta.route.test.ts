/**
 * @jest-environment node
 */

import type { PreOrderEta } from '@ridendine/routing';

const mockEstimatePreOrder = jest.fn<Promise<PreOrderEta>, [string, string]>();

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
}));

jest.mock('@ridendine/routing', () => ({
  OsrmProvider: jest.fn(() => ({})),
  EtaService: jest.fn(() => ({
    estimatePreOrder: mockEstimatePreOrder,
  })),
}));

describe('GET /api/eta', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns 400 when storefrontId is missing', async () => {
    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 when addressId is missing', async () => {
    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns ETA data when both params are provided', async () => {
    mockEstimatePreOrder.mockResolvedValue({
      minMinutes: 25,
      maxMinutes: 35,
      prepTime: 20,
      driveTime: 10,
    });

    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1&addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.minMinutes).toBe(25);
    expect(body.maxMinutes).toBe(35);
    expect(body.prepTime).toBe(20);
    expect(body.driveTime).toBe(10);
  });

  it('returns fallback ETA when service throws', async () => {
    mockEstimatePreOrder.mockRejectedValue(new Error('Routing unavailable'));

    const { GET } = await import('../../src/app/api/eta/route');
    const req = new Request('http://localhost/api/eta?storefrontId=sf1&addressId=addr1');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.minMinutes).toBe(30);
    expect(body.maxMinutes).toBe(45);
  });
});
