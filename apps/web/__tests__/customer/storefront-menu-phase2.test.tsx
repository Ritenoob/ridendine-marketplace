/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@ridendine/ui', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Button: ({
    children,
    disabled,
    loading,
    onClick,
    type = 'button',
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  useToast: () => ({ showToast: jest.fn() }),
}));

const mockUseCart = jest.fn();

jest.mock('@/contexts/cart-context', () => ({
  useCart: (...args: unknown[]) => mockUseCart(...args),
}));

import { StorefrontMenu } from '../../src/components/storefront/storefront-menu';

const menuItems = [
  {
    id: 'item-1',
    name: 'Butter Chicken',
    description: 'Creamy tomato curry',
    price: 18.99,
    image_url: null,
    is_available: true,
    is_featured: true,
    dietary_tags: ['Gluten-free'],
    prep_time_minutes: 18,
    category_id: 'mains',
    menu_categories: { id: 'mains', name: 'Mains', sort_order: 2 },
  },
  {
    id: 'item-2',
    name: 'Samosa Chaat',
    description: 'Crisp samosas with chickpeas',
    price: 11.5,
    image_url: null,
    is_available: true,
    is_featured: false,
    dietary_tags: ['Vegetarian', 'Spicy'],
    prep_time_minutes: 10,
    category_id: 'starters',
    menu_categories: { id: 'starters', name: 'Starters', sort_order: 1 },
  },
  {
    id: 'item-3',
    name: 'Mango Lassi',
    description: 'Sweet yogurt drink',
    price: 6,
    image_url: null,
    is_available: true,
    is_featured: false,
    dietary_tags: ['Vegetarian'],
    prep_time_minutes: 5,
    category_id: 'drinks',
    menu_categories: { id: 'drinks', name: 'Drinks', sort_order: 3 },
  },
];

const emptyCart = {
  addToCart: jest.fn(),
  loading: false,
  cart: { storefront_id: 'sf-1', items: [] },
  itemCount: 0,
};

const cartWithMinimumGap = {
  addToCart: jest.fn(),
  loading: false,
  cart: {
    storefront_id: 'sf-1',
    items: [
      {
        id: 'cart-1',
        menu_item_id: 'item-1',
        name: 'Butter Chicken',
        price: 18.99,
        quantity: 1,
      },
    ],
  },
  itemCount: 1,
};

function renderMenu(cartState = emptyCart) {
  mockUseCart.mockReturnValue(cartState);
  return render(
    <StorefrontMenu
      storefrontId="sf-1"
      storefrontName="Every Bite Yum"
      minOrderAmount={25}
      menuItems={menuItems}
    />,
  );
}

describe('StorefrontMenu Phase 2 customer ordering experience', () => {
  it('surfaces featured dishes above the full category menu', () => {
    renderMenu();

    expect(screen.getByRole('heading', { name: /featured dishes/i })).toBeInTheDocument();
    expect(screen.getAllByText('Butter Chicken').length).toBeGreaterThanOrEqual(2);
  });

  it('renders category anchor navigation for quick scanning', () => {
    renderMenu();

    expect(screen.getByRole('link', { name: /Starters/i })).toHaveAttribute('href', '#menu-category-starters');
    expect(screen.getByRole('link', { name: /Mains/i })).toHaveAttribute('href', '#menu-category-mains');
    expect(screen.getByRole('link', { name: /Drinks/i })).toHaveAttribute('href', '#menu-category-drinks');
  });

  it('filters dishes with menu search', () => {
    renderMenu();

    fireEvent.change(screen.getByLabelText(/search this menu/i), {
      target: { value: 'lassi' },
    });

    expect(screen.getByText('Mango Lassi')).toBeInTheDocument();
    expect(screen.queryByText('Butter Chicken')).not.toBeInTheDocument();
  });

  it('filters dishes with dietary quick filters', () => {
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: /Vegetarian/i }));

    expect(screen.getByText('Samosa Chaat')).toBeInTheDocument();
    expect(screen.getByText('Mango Lassi')).toBeInTheDocument();
    expect(screen.queryByText('Butter Chicken')).not.toBeInTheDocument();
  });

  it('shows how many of a dish are already in the cart', () => {
    renderMenu({
      ...cartWithMinimumGap,
      cart: {
        storefront_id: 'sf-1',
        items: [
          {
            id: 'cart-1',
            menu_item_id: 'item-1',
            name: 'Butter Chicken',
            price: 18.99,
            quantity: 2,
          },
        ],
      },
      itemCount: 2,
    });

    expect(screen.getAllByText('2 in cart').length).toBeGreaterThanOrEqual(1);
  });

  it('shows minimum-order progress and disables checkout below minimum', () => {
    renderMenu(cartWithMinimumGap);

    expect(screen.getAllByText(/\$6\.01 away from checkout/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();
  });
});
