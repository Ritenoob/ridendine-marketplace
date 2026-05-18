/**
 * @jest-environment node
 */

import { buildCheckoutQuote } from '../quote';

const mockGetCartWithItems = jest.fn();
const mockCalculateDeliveryFee = jest.fn();
const mockIsWithinDeliveryZone = jest.fn();
const mockGetTaxRates = jest.fn();

jest.mock('@ridendine/db', () => ({
  getCartWithItems: (...args: unknown[]) => mockGetCartWithItems(...args),
}));

jest.mock('@ridendine/engine', () => ({
  BASE_DELIVERY_FEE: 500,
  calculateDeliveryFee: (...args: unknown[]) => mockCalculateDeliveryFee(...args),
  createTaxConfigService: () => ({ getTaxRates: () => mockGetTaxRates() }),
  estimateDistance: () => 1.2,
  getSurgeMultiplier: async () => 1,
  isWithinDeliveryZone: (...args: unknown[]) => mockIsWithinDeliveryZone(...args),
}));

function createAdminClientMock(overrides: {
  optionRows?: Array<Record<string, unknown>>;
  addressRow?: Record<string, unknown> | null;
} = {}) {
  const menuRows = [
    {
      id: 'menu-1',
      storefront_id: 'storefront-1',
      price: 10,
      is_available: true,
      is_sold_out: false,
    },
  ];
  const optionRows =
    overrides.optionRows ??
    [
      {
        id: 'option-1',
        menu_item_id: 'menu-1',
        name: 'Spice level',
        is_required: true,
        max_selections: 1,
        menu_item_option_values: [
          {
            id: 'value-1',
            option_id: 'option-1',
            name: 'Hot',
            price_adjustment: 2,
            is_available: true,
            sort_order: 0,
          },
        ],
      },
    ];

  return {
    from(table: string) {
      if (table === 'menu_items') {
        return {
          select: () => ({
            in: async () => ({ data: menuRows, error: null }),
          }),
        };
      }
      if (table === 'menu_item_options') {
        return {
          select: () => ({
            in: async () => ({ data: optionRows, error: null }),
          }),
        };
      }
      if (table === 'customer_addresses') {
        return {
          select: () => {
            const chain = {
              eq: () => chain,
              maybeSingle: async () => ({
                data: overrides.addressRow ?? { lat: 43.2557, lng: -79.8711 },
                error: null,
              }),
              single: async () => ({
                data: overrides.addressRow ?? { lat: 43.2557, lng: -79.8711 },
                error: null,
              }),
            };
            return chain;
          },
        };
      }
      if (table === 'chef_kitchens') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'promo_codes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  };
}

describe('buildCheckoutQuote modifier validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateDeliveryFee.mockReturnValue({ feeCents: 500 });
    mockIsWithinDeliveryZone.mockResolvedValue(true);
    mockGetTaxRates.mockResolvedValue({ hstRate: 0, serviceFeePercent: 0 });
    mockGetCartWithItems.mockResolvedValue({
      id: 'cart-1',
      cart_items: [
        {
          menu_item_id: 'menu-1',
          quantity: 2,
          unit_price: 10,
          selected_options: [{ optionId: 'option-1', valueId: 'value-1', priceAdjustment: -99 }],
        },
      ],
    });
  });

  it('calculates modifier price deltas from the database, not the client payload', async () => {
    const result = await buildCheckoutQuote({
      adminClient: createAdminClientMock() as any,
      customerId: 'cust-1',
      storefrontId: 'storefront-1',
      deliveryAddressId: 'address-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quote.subtotal).toBe(24);
    expect(result.value.items[0].modifiers).toEqual([
      {
        optionId: 'option-1',
        valueId: 'value-1',
        optionName: 'Spice level',
        valueName: 'Hot',
        priceAdjustment: 2,
      },
    ]);
  });

  it('rejects a missing required option', async () => {
    mockGetCartWithItems.mockResolvedValueOnce({
      id: 'cart-1',
      cart_items: [{ menu_item_id: 'menu-1', quantity: 1, unit_price: 10, selected_options: [] }],
    });

    const result = await buildCheckoutQuote({
      adminClient: createAdminClientMock() as any,
      customerId: 'cust-1',
      storefrontId: 'storefront-1',
      deliveryAddressId: 'address-1',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'REQUIRED_OPTION_MISSING' },
    });
  });

  it('rejects more selections than the option allows', async () => {
    mockGetCartWithItems.mockResolvedValueOnce({
      id: 'cart-1',
      cart_items: [
        {
          menu_item_id: 'menu-1',
          quantity: 1,
          unit_price: 10,
          selected_options: [
            { optionId: 'option-1', valueId: 'value-1' },
            { optionId: 'option-1', valueId: 'value-2' },
          ],
        },
      ],
    });

    const result = await buildCheckoutQuote({
      adminClient: createAdminClientMock({
        optionRows: [
          {
            id: 'option-1',
            menu_item_id: 'menu-1',
            name: 'Spice level',
            is_required: true,
            max_selections: 1,
            menu_item_option_values: [
              {
                id: 'value-1',
                option_id: 'option-1',
                name: 'Hot',
                price_adjustment: 2,
                is_available: true,
              },
              {
                id: 'value-2',
                option_id: 'option-1',
                name: 'Mild',
                price_adjustment: 1,
                is_available: true,
              },
            ],
          },
        ],
      }) as any,
      customerId: 'cust-1',
      storefrontId: 'storefront-1',
      deliveryAddressId: 'address-1',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'TOO_MANY_OPTIONS' },
    });
  });

  it('rejects unavailable option values', async () => {
    const result = await buildCheckoutQuote({
      adminClient: createAdminClientMock({
        optionRows: [
          {
            id: 'option-1',
            menu_item_id: 'menu-1',
            name: 'Spice level',
            is_required: true,
            max_selections: 1,
            menu_item_option_values: [
              {
                id: 'value-1',
                option_id: 'option-1',
                name: 'Hot',
                price_adjustment: 2,
                is_available: false,
              },
            ],
          },
        ],
      }) as any,
      customerId: 'cust-1',
      storefrontId: 'storefront-1',
      deliveryAddressId: 'address-1',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'OPTION_VALUE_UNAVAILABLE' },
    });
  });
});
