/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CheckoutPage from '../../src/app/checkout/page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'storefrontId' ? 'sf-1' : null),
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useElements: () => ({}),
  useStripe: () => ({
    confirmPayment: jest.fn(),
  }),
}));

jest.mock('@ridendine/ui', () => ({
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
    <button disabled={disabled || loading} onClick={onClick} type={type}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  Input: ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label?: string;
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <label>
      {label}
      <input value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  ),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock('@/components/checkout/saved-card-selector', () => ({
  SavedCardSelector: () => <div>Use a new card</div>,
}));

jest.mock('@/hooks/use-eta', () => ({
  useEta: () => ({
    eta: { minMinutes: 32, maxMinutes: 45 },
    loading: false,
  }),
}));

describe('CheckoutPage polish', () => {
  beforeEach(() => {
    mockPush.mockClear();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/cart')) {
        return {
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: 'cart-1',
              storefront_id: 'sf-1',
              cart_items: [
                {
                  id: 'cart-item-1',
                  menu_item_id: 'menu-1',
                  quantity: 2,
                  unit_price: 18.99,
                  menu_items: {
                    name: 'Butter Chicken',
                    image_url: null,
                  },
                },
                {
                  id: 'cart-item-2',
                  menu_item_id: 'menu-2',
                  quantity: 1,
                  unit_price: 6,
                  menu_items: {
                    name: 'Mango Lassi',
                    image_url: null,
                  },
                },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/addresses') {
        return {
          status: 200,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'addr-1',
                label: 'Home',
                address_line1: '123 King St',
                address_line2: null,
                city: 'Hamilton',
                state: 'ON',
                postal_code: 'L8P 1A1',
              },
            ],
          }),
        } as Response;
      }

      return {
        status: 404,
        json: async () => ({ success: false }),
      } as Response;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('frames checkout as a trusted review before payment', async () => {
    render(<CheckoutPage />);

    expect(await screen.findByText('Finish your order')).toBeInTheDocument();
    expect(screen.getByText('Delivery details first')).toBeInTheDocument();
    expect(screen.getByText('Server-confirmed fees')).toBeInTheDocument();
    expect(screen.getByText('Secure Stripe payment')).toBeInTheDocument();
    expect(screen.getByText('Checkout confidence')).toBeInTheDocument();
    expect(screen.getByText('Cart subtotal shown now')).toBeInTheDocument();
    expect(screen.getByText('Fees lock before payment')).toBeInTheDocument();
    expect(screen.getByText('Edit before payment')).toBeInTheDocument();
  });
});
