/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsClient from '../app/settings/settings-client';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
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

jest.mock('@/components/settings/notification-preferences', () => ({
  NotificationPreferences: () => <section>Notification Preferences</section>,
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  Button: ({
    children,
    disabled,
    onClick,
    type,
    variant,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: string;
  }) => (
    <button type={type ?? 'button'} disabled={disabled} data-variant={variant} onClick={onClick}>
      {children}
    </button>
  ),
}));

const driver = {
  id: 'driver-1',
  first_name: 'Sean',
  last_name: 'Driver',
  email: 'sean@ridendine.ca',
  phone: '555-0100',
  status: 'approved',
  instant_payouts_enabled: false,
};

describe('SettingsClient', () => {
  beforeEach(() => {
    refresh.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('renders the driver settings command surface', () => {
    render(<SettingsClient driver={driver as never} balanceCents={12550} currency="CAD" />);

    expect(screen.getByText('Driver settings command center')).toBeInTheDocument();
    expect(screen.getByText('Payable balance')).toBeInTheDocument();
    expect(screen.getByText('Instant payouts')).toBeInTheDocument();
    expect(screen.getByText('Notification sync')).toBeInTheDocument();
    expect(screen.getByText('Account controls')).toBeInTheDocument();
    expect(screen.getAllByText('CA$125.50').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /open earnings/i })).toHaveAttribute(
      'href',
      '/earnings'
    );
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('keeps instant payout preference wired to the driver PATCH endpoint', async () => {
    render(<SettingsClient driver={driver as never} balanceCents={12550} currency="CAD" />);

    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/driver',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ instant_payouts_enabled: true }),
        })
      );
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
