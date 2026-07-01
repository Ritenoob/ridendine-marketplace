/**
 * @jest-environment node
 */

const mockResolveByHash = jest.fn();
const mockTouch = jest.fn();

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
  resolvePartnerByKeyHash: (...a: unknown[]) => mockResolveByHash(...a),
  touchPartnerKey: (...a: unknown[]) => mockTouch(...a),
}));

import { resolvePartnerContext, partnerHasScope } from '../auth';

const admin = {} as never;
const KEY = 'rdk_live_' + 'a'.repeat(32);

function reqWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/partner/checkout', { method: 'POST', headers });
}

describe('resolvePartnerContext', () => {
  const ORIGINAL = process.env.PARTNER_API_KEY;
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveByHash.mockResolvedValue(null);
    process.env.PARTNER_API_KEY = ORIGINAL;
  });
  afterEach(() => { process.env.PARTNER_API_KEY = ORIGINAL; });

  it('returns null when no key is present', async () => {
    expect(await resolvePartnerContext(reqWith({}), admin)).toBeNull();
    expect(mockResolveByHash).not.toHaveBeenCalled();
  });

  it('returns null for a too-short key without hitting the DB', async () => {
    expect(await resolvePartnerContext(reqWith({ 'x-api-key': 'short' }), admin)).toBeNull();
    expect(mockResolveByHash).not.toHaveBeenCalled();
  });

  it('resolves a DB-backed partner and stamps last_used', async () => {
    mockResolveByHash.mockResolvedValue({
      partnerId: 'p1', partnerName: 'Hoang Gia Pho', testMode: false, scopes: ['quote', 'checkout'], keyId: 'k1',
    });
    const ctx = await resolvePartnerContext(reqWith({ 'x-api-key': KEY }), admin);
    expect(ctx).toMatchObject({ partnerId: 'p1', testMode: false, scopes: ['quote', 'checkout'] });
    // key is sha256-hashed before lookup (never the raw key)
    const passedHash = mockResolveByHash.mock.calls[0][1];
    expect(passedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(passedHash).not.toContain('rdk_live_');
    expect(mockTouch).toHaveBeenCalledWith(admin, 'k1');
  });

  it('carries test_mode through from the partner', async () => {
    mockResolveByHash.mockResolvedValue({
      partnerId: 'p2', partnerName: 'Sandbox', testMode: true, scopes: ['quote', 'checkout'], keyId: 'k2',
    });
    const ctx = await resolvePartnerContext(reqWith({ 'x-api-key': KEY }), admin);
    expect(ctx?.testMode).toBe(true);
  });

  it('falls back to the legacy env key (anonymous, non-test) when DB misses', async () => {
    process.env.PARTNER_API_KEY = KEY;
    const ctx = await resolvePartnerContext(reqWith({ 'x-api-key': KEY }), admin);
    expect(ctx).toMatchObject({ partnerId: null, partnerName: 'legacy-env-key', testMode: false });
  });

  it('returns null when DB misses and the env key does not match', async () => {
    process.env.PARTNER_API_KEY = KEY;
    expect(await resolvePartnerContext(reqWith({ 'x-api-key': 'rdk_live_' + 'b'.repeat(32) }), admin)).toBeNull();
  });

  it('accepts the key via Authorization: Bearer', async () => {
    mockResolveByHash.mockResolvedValue({
      partnerId: 'p1', partnerName: 'X', testMode: false, scopes: ['quote'], keyId: 'k1',
    });
    const ctx = await resolvePartnerContext(reqWith({ authorization: `Bearer ${KEY}` }), admin);
    expect(ctx?.partnerId).toBe('p1');
  });
});

describe('partnerHasScope', () => {
  const base = { partnerId: 'p', partnerName: 'x', testMode: false, keyId: 'k' };
  it('is true when the scope is present', () => {
    expect(partnerHasScope({ ...base, scopes: ['quote', 'checkout'] }, 'checkout')).toBe(true);
  });
  it('is false when the scope is absent', () => {
    expect(partnerHasScope({ ...base, scopes: ['quote'] }, 'checkout')).toBe(false);
  });
});
