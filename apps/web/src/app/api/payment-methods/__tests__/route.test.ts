/**
 * @jest-environment node
 */

const mockGetCurrentCustomer = jest.fn();
const mockHandleApiError = jest.fn();
const mockGetStripeClient = jest.fn();
const mockAssertStripeConfigured = jest.fn();
const mockGetOrCreateStripeCustomer = jest.fn();

jest.mock('@/lib/auth-helpers', () => ({
  getCurrentCustomer: (...args: unknown[]) => mockGetCurrentCustomer(...args),
  handleApiError: (...args: unknown[]) => mockHandleApiError(...args),
}));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: () => mockGetStripeClient(),
  assertStripeConfigured: () => mockAssertStripeConfigured(),
  getOrCreateStripeCustomer: (...args: unknown[]) => mockGetOrCreateStripeCustomer(...args),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}));

jest.mock('@ridendine/db', () => ({
  createServerClient: jest.fn().mockReturnValue({}),
  createAdminClient: jest.fn().mockReturnValue({}),
}));

import { GET, DELETE } from '../route';

const mockCustomer = {
  id: 'cust-123',
  user_id: 'user-abc',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
};

const mockStripePaymentMethods = {
  data: [
    {
      id: 'pm_test_1',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2027,
      },
    },
    {
      id: 'pm_test_2',
      type: 'card',
      card: {
        brand: 'mastercard',
        last4: '5555',
        exp_month: 6,
        exp_year: 2026,
      },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHandleApiError.mockImplementation((error: unknown) => {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized', status: 401 };
    }
    return { error: 'Internal server error', status: 500 };
  });
});

describe('GET /api/payment-methods', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentCustomer.mockRejectedValue(new Error('Unauthorized'));

    const req = new Request('http://localhost/api/payment-methods');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns saved payment methods for authenticated customer', async () => {
    mockGetCurrentCustomer.mockResolvedValue(mockCustomer);
    mockGetOrCreateStripeCustomer.mockResolvedValue('stripe_cust_123');

    const mockStripe = {
      paymentMethods: {
        list: jest.fn().mockResolvedValue(mockStripePaymentMethods),
      },
    };
    mockGetStripeClient.mockReturnValue(mockStripe);

    const req = new Request('http://localhost/api/payment-methods');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].id).toBe('pm_test_1');
    expect(json.data[0].card.brand).toBe('visa');
    expect(json.data[0].card.last4).toBe('4242');
  });

  it('returns empty array when no stripe customer exists yet', async () => {
    mockGetCurrentCustomer.mockResolvedValue(mockCustomer);
    mockGetOrCreateStripeCustomer.mockResolvedValue(null);

    const req = new Request('http://localhost/api/payment-methods');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });
});

describe('DELETE /api/payment-methods', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetCurrentCustomer.mockRejectedValue(new Error('Unauthorized'));

    const req = new Request('http://localhost/api/payment-methods?id=pm_test_1', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when no payment method id provided', async () => {
    mockGetCurrentCustomer.mockResolvedValue(mockCustomer);

    const req = new Request('http://localhost/api/payment-methods', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('id');
  });

  it('detaches payment method successfully', async () => {
    mockGetCurrentCustomer.mockResolvedValue(mockCustomer);
    mockGetOrCreateStripeCustomer.mockResolvedValue('stripe_cust_123');

    const mockStripe = {
      paymentMethods: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'pm_test_1',
          customer: 'stripe_cust_123',
        }),
        detach: jest.fn().mockResolvedValue({ id: 'pm_test_1' }),
      },
    };
    mockGetStripeClient.mockReturnValue(mockStripe);

    const req = new Request('http://localhost/api/payment-methods?id=pm_test_1', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_test_1');
  });

  it('returns 403 when payment method belongs to another customer', async () => {
    mockGetCurrentCustomer.mockResolvedValue(mockCustomer);
    mockGetOrCreateStripeCustomer.mockResolvedValue('stripe_cust_123');

    const mockStripe = {
      paymentMethods: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'pm_test_1',
          customer: 'stripe_other_customer',
        }),
        detach: jest.fn(),
      },
    };
    mockGetStripeClient.mockReturnValue(mockStripe);

    const req = new Request('http://localhost/api/payment-methods?id=pm_test_1', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('not authorized');
    expect(mockStripe.paymentMethods.detach).not.toHaveBeenCalled();
  });
});
