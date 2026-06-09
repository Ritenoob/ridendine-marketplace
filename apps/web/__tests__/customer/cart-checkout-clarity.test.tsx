/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => 'sf-1' }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button disabled={disabled} onClick={onClick}>
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
    action?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

const mockUseCart = jest.fn();

jest.mock('@/contexts/cart-context', () => ({
  useCart: (...args: unknown[]) => mockUseCart(...args),
}));

import CartPage from '../../src/app/cart/page';

const cartState = {
  cart: {
    storefront_id: 'sf-1',
    items: [
      { id: 'cart-1', name: 'Butter Chicken', price: 18.99, quantity: 2, image_url: null },
      { id: 'cart-2', name: 'Mango Lassi', price: 6, quantity: 1, image_url: null },
    ],
  },
  loading: false,
  storefrontId: 'sf-1',
  fetchCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
};

describe('CartPage checkout clarity', () => {
  beforeEach(() => {
    mockUseCart.mockReturnValue(cartState);
  });

  it('shows cart subtotal instead of a fake final total', () => {
    render(<CartPage />);

    expect(screen.getAllByText(/Cart subtotal/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$43.98').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show hardcoded delivery, service fee, HST, or final total rows', () => {
    render(<CartPage />);

    expect(screen.queryByText(/^Delivery fee$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Service fee \(8%\)$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^HST \(13%\)$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Total$/i)).not.toBeInTheDocument();
  });

  it('explains that final fees are confirmed at checkout', () => {
    render(<CartPage />);

    expect(screen.getAllByText(/Delivery, service fees, HST, promos, and payment are confirmed at checkout/i).length)
      .toBeGreaterThanOrEqual(1);
  });

  it('uses subtotal language in the sticky mobile checkout bar', () => {
    render(<CartPage />);

    const bar = screen.getByTestId('sticky-mobile-checkout-bar');
    expect(bar.textContent).toMatch(/Subtotal/i);
    expect(bar.textContent).not.toMatch(/^Total/);
  });

  it('frames the cart as a review handoff before checkout', () => {
    render(<CartPage />);

    expect(screen.getByRole('heading', { name: /review your order/i })).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('Checkout confidence')).toBeInTheDocument();
    expect(screen.getByText('Secure payment')).toBeInTheDocument();
    expect(screen.getByText('Fees confirmed at checkout')).toBeInTheDocument();
    expect(screen.getByText('Edit until payment')).toBeInTheDocument();
  });
});
