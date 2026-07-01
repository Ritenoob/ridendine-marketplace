/**
 * Cart context persistence across refresh.
 *
 * The cart itself is server-backed (/api/cart); only the active storefrontId
 * pointer is persisted to localStorage so a refreshed page can re-hydrate the
 * cart. These tests cover: persisting the pointer, restoring it on mount
 * (with auto-fetch), and clearing it via clearCart.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@ridendine/utils', () => ({
  formatCurrency: (value: number) => `$${value.toFixed(2)}`,
}));

import { CartProvider, useCart, CART_STOREFRONT_STORAGE_KEY } from '@/contexts/cart-context';

function cartApiResponse(storefrontId: string) {
  return {
    success: true,
    data: {
      id: `cart-${storefrontId}`,
      storefront_id: storefrontId,
      cart_items: [
        {
          id: 'item-1',
          menu_item_id: 'mi-1',
          unit_price: 12.5,
          quantity: 2,
          menu_items: { name: 'Butter Chicken' },
        },
      ],
    },
  };
}

function Probe() {
  const { cart, storefrontId, setStorefrontId, clearCart } = useCart();
  return (
    <div>
      <span data-testid="storefront">{storefrontId ?? 'none'}</span>
      <span data-testid="cart-id">{cart?.id ?? 'none'}</span>
      <button onClick={() => setStorefrontId('sf-1')}>set storefront</button>
      <button onClick={clearCart}>clear cart</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <CartProvider>
      <Probe />
    </CartProvider>
  );
}

describe('cart context storefront persistence', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = jest.fn(async (url: string) => {
      const storefrontId =
        new URL(url, 'http://localhost').searchParams.get('storefrontId') ?? '';
      return { json: async () => cartApiResponse(storefrontId) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('persists the storefrontId to localStorage when set', async () => {
    renderProvider();

    fireEvent.click(screen.getByText('set storefront'));

    expect(window.localStorage.getItem(CART_STOREFRONT_STORAGE_KEY)).toBe('sf-1');

    // The existing storefrontId && !cart effect auto-fetches the cart.
    await waitFor(() => {
      expect(screen.getByTestId('cart-id').textContent).toBe('cart-sf-1');
    });
  });

  it('restores a stored storefrontId on mount and auto-fetches the cart', async () => {
    window.localStorage.setItem(CART_STOREFRONT_STORAGE_KEY, 'sf-9');

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('storefront').textContent).toBe('sf-9');
      expect(screen.getByTestId('cart-id').textContent).toBe('cart-sf-9');
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/cart?storefrontId=sf-9');
  });

  it('does not fetch anything on mount when no pointer is stored', () => {
    renderProvider();

    expect(screen.getByTestId('storefront').textContent).toBe('none');
    expect(screen.getByTestId('cart-id').textContent).toBe('none');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clearCart clears both the in-memory state and the stored pointer', async () => {
    window.localStorage.setItem(CART_STOREFRONT_STORAGE_KEY, 'sf-9');
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('cart-id').textContent).toBe('cart-sf-9');
    });

    fireEvent.click(screen.getByText('clear cart'));

    expect(window.localStorage.getItem(CART_STOREFRONT_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('storefront').textContent).toBe('none');
    expect(screen.getByTestId('cart-id').textContent).toBe('none');
  });
});
