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

const mockPauseStorefront = jest.fn();
const mockUnpauseStorefront = jest.fn();

const mockGetEngine = jest.fn(() => ({
  kitchen: {
    pauseStorefront: mockPauseStorefront,
    unpauseStorefront: mockUnpauseStorefront,
  },
}));

const mockGetChefActorContext = jest.fn();
const mockErrorResponse = jest.fn(
  (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ error: message }), { status })
);
const mockSuccessResponse = jest.fn(
  (data: unknown) =>
    new Response(JSON.stringify({ success: true, data }), { status: 200 })
);

jest.mock('@/lib/engine', () => ({
  getEngine: (...args: unknown[]) => mockGetEngine(...args),
  getChefActorContext: (...args: unknown[]) => mockGetChefActorContext(...args),
  errorResponse: (...args: unknown[]) => mockErrorResponse(...args),
  successResponse: (...args: unknown[]) => mockSuccessResponse(...args),
}));

import { POST, DELETE } from '../route';

const CHEF_CONTEXT = {
  storefrontId: 'sf-1',
  chefId: 'chef-1',
  userId: 'user-1',
  actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
};

describe('kitchen pause route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChefActorContext.mockResolvedValue(CHEF_CONTEXT);
    mockPauseStorefront.mockResolvedValue({ success: true, data: { is_paused: true } });
    mockUnpauseStorefront.mockResolvedValue({ success: true, data: { is_paused: false } });
  });

  describe('POST /api/kitchen/pause', () => {
    it('pauses the storefront via the engine', async () => {
      const res = await POST();
      const body = await res.json();

      expect(mockPauseStorefront).toHaveBeenCalledWith(
        'sf-1',
        'Chef paused service',
        CHEF_CONTEXT.actor
      );
      expect(body.success).toBe(true);
      expect(body.data.isPaused).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetChefActorContext.mockResolvedValueOnce(null);

      const res = await POST();
      expect(res.status).toBe(401);
      expect(mockPauseStorefront).not.toHaveBeenCalled();
    });

    it('surfaces engine FORBIDDEN as 403', async () => {
      mockPauseStorefront.mockResolvedValueOnce({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this storefront' },
      });

      await POST();
      expect(mockErrorResponse).toHaveBeenCalledWith(
        'FORBIDDEN',
        'You cannot manage this storefront',
        403
      );
    });

    it('returns 500 on engine error without a code', async () => {
      mockPauseStorefront.mockResolvedValueOnce({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'DB write failed' },
      });

      await POST();
      expect(mockErrorResponse).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/kitchen/pause', () => {
    it('resumes the storefront via the engine', async () => {
      const res = await DELETE();
      const body = await res.json();

      expect(mockUnpauseStorefront).toHaveBeenCalledWith('sf-1', CHEF_CONTEXT.actor);
      expect(body.success).toBe(true);
      expect(body.data.isPaused).toBe(false);
    });

    it('returns 401 when not authenticated', async () => {
      mockGetChefActorContext.mockResolvedValueOnce(null);

      const res = await DELETE();
      expect(res.status).toBe(401);
      expect(mockUnpauseStorefront).not.toHaveBeenCalled();
    });
  });
});
