/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrdersPage from '../../src/app/account/orders/page';

const push = jest.fn();
const mockUseAuthContext = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock('@ridendine/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    disabled,
    loading,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
  }) => (
    <button disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  NoOrdersEmpty: () => <div>No orders yet</div>,
  Spinner: () => <div role="status">Loading</div>,
}));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

const order = {
  id: 'order-1',
  order_number: 'RD-1001',
  status: 'delivered',
  created_at: '2026-06-09T12:00:00Z',
  total: 38.5,
  storefront: {
    id: 'sf-1',
    name: 'Every Bite Yum',
    slug: 'every-bite-yum',
  },
};

function setupFetch(reorderStatus = 201) {
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/orders') {
      return jsonResponse({ success: true, data: { orders: [order] } });
    }
    if (url === '/api/orders/order-1') {
      return jsonResponse({
        success: true,
        data: {
          order: {
            items: [{ id: 'item-1', quantity: 1, menu_item: { id: 'menu-1', name: 'Butter Chicken' } }],
          },
        },
      });
    }
    if (url === '/api/orders/order-1/reorder' && init?.method === 'POST') {
      if (reorderStatus >= 400) {
        return jsonResponse({ success: false, error: 'One or more items are no longer available' }, reorderStatus);
      }
      return jsonResponse({ success: true, data: { cartId: 'cart-1' } }, reorderStatus);
    }
    return jsonResponse({ success: false, error: `Unexpected fetch: ${url}` }, 500);
  });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('OrdersPage reorder continuity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  });

  it('uses the server reorder endpoint and routes to cart on success', async () => {
    const fetchMock = setupFetch();

    render(<OrdersPage />);

    fireEvent.click(await screen.findByRole('button', { name: /reorder/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/orders/order-1/reorder', expect.objectContaining({ method: 'POST' }));
    });
    expect(push).toHaveBeenCalledWith('/cart?storefrontId=sf-1');
  });

  it('shows a readable error when reorder fails', async () => {
    setupFetch(409);

    render(<OrdersPage />);

    fireEvent.click(await screen.findByRole('button', { name: /reorder/i }));

    expect(await screen.findByText('One or more items are no longer available')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
