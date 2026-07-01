/**
 * @jest-environment node
 */
// Tests for /api/notifications/subscribe route

jest.mock('@ridendine/db', () => ({
  ordersTable: jest.fn((client) => client.from('orders')),
  orderItemsTable: jest.fn((client) => client.from('order_items')),
  orderStatusHistoryTable: jest.fn((client) => client.from('order_status_history')),
  checkoutIdempotencyKeysTable: jest.fn((client) => client.from('checkout_idempotency_keys')),
  menuItemsTable: jest.fn((client) => client.from('menu_items')),
  menuItemOptionsTable: jest.fn((client) => client.from('menu_item_options')),
  menuItemOptionValuesTable: jest.fn((client) => client.from('menu_item_option_values')),
  chefStorefrontsTable: jest.fn((client) => client.from('chef_storefronts')),
  chefKitchensTable: jest.fn((client) => client.from('chef_kitchens')),
  chefAvailabilityTable: jest.fn((client) => client.from('chef_availability')),
  chefProfilesTable: jest.fn((client) => client.from('chef_profiles')),
  customersTable: jest.fn((client) => client.from('customers')),
  customerAddressesTable: jest.fn((client) => client.from('customer_addresses')),
  favoritesTable: jest.fn((client) => client.from('favorites')),
  loyaltyTransactionsTable: jest.fn((client) => client.from('loyalty_transactions')),
  cartItemsTable: jest.fn((client) => client.from('cart_items')),
  chefPayoutAccountsTable: jest.fn((client) => client.from('chef_payout_accounts')),
  chefPayoutsTable: jest.fn((client) => client.from('chef_payouts')),
  notificationsTable: jest.fn((client) => client.from('notifications')),
  pushSubscriptionsTable: jest.fn((client) => client.from('push_subscriptions')),
  reviewsTable: jest.fn((client) => client.from('reviews')),
  promoCodesTable: jest.fn((client) => client.from('promo_codes')),
  serviceAreasTable: jest.fn((client) => client.from('service_areas')),
  createServerClient: jest.fn(),
  getCustomerByUserId: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ getAll: jest.fn().mockReturnValue([]) }),
}));

jest.mock('@/lib/auth-helpers', () => ({
  getCurrentCustomer: jest.fn(),
  handleApiError: jest.fn().mockImplementation((err: unknown) => {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') return { error: 'Unauthorized', status: 401 };
      return { error: err.message, status: 400 };
    }
    return { error: 'Internal server error', status: 500 };
  }),
}));

import { POST, DELETE } from '../../../src/app/api/notifications/subscribe/route';
import { getCurrentCustomer } from '@/lib/auth-helpers';
import { createServerClient } from '@ridendine/db';

const mockCurrentCustomer = getCurrentCustomer as jest.Mock;
const mockCreateServerClient = createServerClient as jest.Mock;

describe('/api/notifications/subscribe', () => {
  let mockUpsert: jest.Mock;
  let mockDeleteEq1: jest.Mock;
  let mockDeleteEq2: jest.Mock;
  let mockDeleteFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentCustomer.mockResolvedValue({ user_id: 'user-123' });

    mockUpsert = jest.fn().mockResolvedValue({ error: null });
    mockDeleteEq2 = jest.fn().mockResolvedValue({ error: null });
    mockDeleteEq1 = jest.fn().mockReturnValue({ eq: mockDeleteEq2 });
    mockDeleteFn = jest.fn().mockReturnValue({ eq: mockDeleteEq1 });

    mockCreateServerClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
      from: jest.fn().mockReturnValue({
        upsert: mockUpsert,
        delete: mockDeleteFn,
      }),
    });
  });

  describe('POST', () => {
    it('returns 200 with success:true for a valid subscription', async () => {
      const req = new Request('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.test/endpoint',
            keys: { p256dh: 'key1', auth: 'auth1' },
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('calls upsert with correct subscription fields', async () => {
      const req = new Request('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.test/endpoint',
            keys: { p256dh: 'key1', auth: 'auth1' },
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(req);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          endpoint: 'https://fcm.test/endpoint',
          p256dh: 'key1',
          auth: 'auth1',
        }),
        expect.objectContaining({ onConflict: 'user_id,endpoint' }),
      );
    });

    it('returns 401 when user is unauthenticated', async () => {
      mockCurrentCustomer.mockRejectedValue(new Error('Unauthorized'));

      const req = new Request('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: { endpoint: 'x', keys: {} } }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE', () => {
    it('returns 200 with success:true when deleting a subscription', async () => {
      const req = new Request('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: 'https://fcm.test/endpoint' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await DELETE(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});
