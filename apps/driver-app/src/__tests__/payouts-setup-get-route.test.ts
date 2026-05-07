/**
 * @jest-environment node
 *
 * Tests for GET /api/payouts/setup — driver payout account status
 */

const mockGetStripeClient = jest.fn(() => ({
  accounts: { retrieve: mockStripeAccountsRetrieve },
}));
const mockStripeAccountsRetrieve = jest.fn();

jest.mock('@ridendine/engine', () => ({
  getStripeClient: mockGetStripeClient,
  assertStripeConfigured: jest.fn(),
}));

const mockFrom = jest.fn();
const mockCreateServerClient = jest.fn(() => ({
  auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'driver@test.com' } } }) },
  from: mockFrom,
}));

jest.mock('@ridendine/db', () => ({
  createServerClient: mockCreateServerClient,
}));

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: jest.fn().mockResolvedValue({
    driverId: 'driver-1',
    actor: { userId: 'user-1', role: 'driver', entityId: 'driver-1' },
  }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}));

describe('GET /api/payouts/setup (driver)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, NEXT_PUBLIC_DRIVER_APP_URL: 'http://localhost:3003' };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'driver-1', first_name: 'John', last_name: 'Doe' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'driver_payout_accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: 'payout-1',
                  stripe_account_id: 'acct_test123',
                  status: 'pending',
                  onboarding_completed_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockStripeAccountsRetrieve.mockResolvedValue({
      id: 'acct_test123',
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 when driver is not authenticated', async () => {
    const { getDriverActorContext } = require('@/lib/engine');
    (getDriverActorContext as jest.Mock).mockResolvedValueOnce(null);

    const { GET } = require('../app/api/payouts/setup/route');
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('returns payout account status when account exists', async () => {
    const { GET } = require('../app/api/payouts/setup/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      connected: true,
      status: expect.any(String),
    });
  });

  it('returns not_connected status when no account exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'driver-1', first_name: 'John', last_name: 'Doe' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'driver_payout_accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const { GET } = require('../app/api/payouts/setup/route');
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.connected).toBe(false);
  });

  it('returns 404 when driver profile is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const { GET } = require('../app/api/payouts/setup/route');
    const response = await GET();

    expect(response.status).toBe(404);
  });
});
