/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfileView from '../app/profile/components/ProfileView';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => ({ get: jest.fn(() => null) }),
}));

jest.mock('next/link', () => {
  return function MockLink({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

jest.mock('@ridendine/db', () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'payout-1',
              stripe_account_id: 'acct_123456789012',
              status: 'active',
            },
          }),
        }),
      }),
    }),
  }),
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <section className={className} {...props}>
      {children}
    </section>
  ),
  Badge: ({
    children,
    className,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

const driver = {
  id: 'driver-1',
  user_id: 'user-1',
  first_name: 'Sean',
  last_name: 'Driver',
  email: 'sean@ridendine.ca',
  phone: '555-0100',
  status: 'approved',
  vehicle_type: 'car',
  vehicle_description: 'White Toyota Corolla',
  instant_payouts_enabled: true,
  created_at: '2026-06-01T12:00:00.000Z',
  updated_at: '2026-06-01T12:00:00.000Z',
};

describe('ProfileView', () => {
  beforeEach(() => {
    refresh.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('renders the driver profile command surface', async () => {
    render(<ProfileView driver={driver as never} />);

    expect(screen.getByText('Driver profile command center')).toBeInTheDocument();
    expect(screen.getByText('Driver status')).toBeInTheDocument();
    expect(screen.getByText('Contact record')).toBeInTheDocument();
    expect(screen.getByText('Vehicle record')).toBeInTheDocument();
    expect(screen.getByText('Payout setup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Driver information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vehicle details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payout account' })).toBeInTheDocument();
    expect(await screen.findByText('acct_123456789...')).toBeInTheDocument();
  });

  it('keeps profile editing wired to the driver PATCH endpoint', async () => {
    render(<ProfileView driver={driver as never} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/driver',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            first_name: 'Sam',
            last_name: 'Driver',
            phone: '555-0100',
          }),
        })
      );
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
