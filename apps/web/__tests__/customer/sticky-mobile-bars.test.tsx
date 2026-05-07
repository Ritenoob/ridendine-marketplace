/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---- shared mocks --------------------------------------------------------

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    className,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  ),
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

const mockUseCart = jest.fn();

jest.mock('@/contexts/cart-context', () => ({
  useCart: (...args: unknown[]) => mockUseCart(...args),
}));

// Import components after mocks are set up
import CartPage from '../../src/app/cart/page';
import { StorefrontMenu } from '../../src/components/storefront/storefront-menu';

// =========================================================================
// Cart page — sticky mobile bar
// =========================================================================

const cartWithItems = {
  cart: {
    storefront_id: 'sf-1',
    items: [{ id: 'item-1', name: 'Tacos', price: 12.5, quantity: 2, image_url: null }],
  },
  loading: false,
  storefrontId: 'sf-1',
  fetchCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
};

const cartEmpty = {
  cart: { storefront_id: 'sf-1', items: [] },
  loading: false,
  storefrontId: 'sf-1',
  fetchCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
};

describe('CartPage sticky mobile bar', () => {
  it('renders sticky mobile checkout bar when cart has items', () => {
    mockUseCart.mockReturnValue(cartWithItems);
    render(<CartPage />);
    expect(screen.getByTestId('sticky-mobile-checkout-bar')).toBeInTheDocument();
  });

  it('shows a dollar amount in the sticky bar', () => {
    mockUseCart.mockReturnValue(cartWithItems);
    render(<CartPage />);
    const bar = screen.getByTestId('sticky-mobile-checkout-bar');
    expect(bar.textContent).toMatch(/\$/);
  });

  it('has "Proceed to Checkout" button in sticky mobile bar', () => {
    mockUseCart.mockReturnValue(cartWithItems);
    render(<CartPage />);
    const bar = screen.getByTestId('sticky-mobile-checkout-bar');
    expect(bar.textContent).toMatch(/Proceed to Checkout/i);
  });

  it('does NOT render sticky mobile bar when cart is empty', () => {
    mockUseCart.mockReturnValue(cartEmpty);
    render(<CartPage />);
    expect(screen.queryByTestId('sticky-mobile-checkout-bar')).not.toBeInTheDocument();
  });
});

// =========================================================================
// StorefrontMenu — sticky mobile bar
// =========================================================================

const baseMenuItem = {
  id: 'mi-1',
  name: 'Butter Chicken',
  description: 'Rich and creamy',
  price: 18.99,
  image_url: null,
  is_available: true,
  is_featured: false,
  dietary_tags: null,
  prep_time_minutes: null,
  category_id: 'cat-1',
  menu_categories: { id: 'cat-1', name: 'Mains', sort_order: 1 },
};

const menuCartWithItems = {
  addToCart: jest.fn(),
  loading: false,
  cart: {
    storefront_id: 'sf-1',
    items: [{ id: 'ci-1', name: 'Butter Chicken', price: 18.99, quantity: 1 }],
  },
  itemCount: 1,
};

const menuCartEmpty = {
  addToCart: jest.fn(),
  loading: false,
  cart: { storefront_id: 'sf-1', items: [] },
  itemCount: 0,
};

describe('StorefrontMenu sticky mobile View Cart bar', () => {
  it('renders sticky mobile View Cart bar when cart has items', () => {
    mockUseCart.mockReturnValue(menuCartWithItems);
    render(<StorefrontMenu storefrontId="sf-1" menuItems={[baseMenuItem]} />);
    expect(screen.getByTestId('sticky-mobile-view-cart-bar')).toBeInTheDocument();
  });

  it('shows item count in sticky mobile View Cart bar', () => {
    mockUseCart.mockReturnValue({ ...menuCartWithItems, itemCount: 2 });
    render(<StorefrontMenu storefrontId="sf-1" menuItems={[baseMenuItem]} />);
    const bar = screen.getByTestId('sticky-mobile-view-cart-bar');
    expect(bar.textContent).toContain('2');
  });

  it('has "View Cart" text in sticky mobile bar', () => {
    mockUseCart.mockReturnValue(menuCartWithItems);
    render(<StorefrontMenu storefrontId="sf-1" menuItems={[baseMenuItem]} />);
    const bar = screen.getByTestId('sticky-mobile-view-cart-bar');
    expect(bar.textContent).toMatch(/View Cart/i);
  });

  it('does NOT render sticky mobile bar when cart is empty', () => {
    mockUseCart.mockReturnValue(menuCartEmpty);
    render(<StorefrontMenu storefrontId="sf-1" menuItems={[baseMenuItem]} />);
    expect(screen.queryByTestId('sticky-mobile-view-cart-bar')).not.toBeInTheDocument();
  });
});
