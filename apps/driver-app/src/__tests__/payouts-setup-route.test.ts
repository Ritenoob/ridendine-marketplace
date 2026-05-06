/**
 * @jest-environment node
 */

const mockStripeAccountsCreate = jest.fn().mockResolvedValue({ id: 'acct_test123' });
const mockStripeAccountLinksCreate = jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup/test' });
const mockGetStripeClient = jest.fn(() => ({
  accounts: { create: mockStripeAccountsCreate },
  accountLinks: { create: mockStripeAccountLinksCreate },
}));

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

describe('POST /api/payouts/setup (driver)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, NEXT_PUBLIC_DRIVER_APP_URL: 'http://localhost:3003' };

    // Default mock: no existing payout account
    mockFrom.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'driver-1', first_name: 'John', last_name: 'Doe' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'driver_payout_accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('creates a Stripe Connect Express account and returns onboarding URL', async () => {
    const { POST } = require('../app/api/payouts/setup/route');
    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.url).toBe('https://connect.stripe.com/setup/test');
    expect(mockStripeAccountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        country: 'CA',
      })
    );
  });

  it('returns 401 when driver is not authenticated', async () => {
    const { getDriverActorContext } = require('@/lib/engine');
    (getDriverActorContext as jest.Mock).mockResolvedValueOnce(null);

    const { POST } = require('../app/api/payouts/setup/route');
    const response = await POST();

    expect(response.status).toBe(401);
  });
});
