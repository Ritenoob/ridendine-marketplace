/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DRIVER_NAV_ITEMS, isDriverNavActive } from '@/components/layout/driver-nav';
import { DriverShell } from '@/components/layout/driver-shell';

const push = jest.fn();
let pathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

jest.mock('next/link', () => {
  const Link = ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => ({
    user: {
      email: 'sean@ridendine.ca',
      user_metadata: { display_name: 'Sean' },
    },
    signOut: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('DriverShell', () => {
  beforeEach(() => {
    pathname = '/';
    push.mockClear();
  });

  it('defines the expected Driver destinations once', () => {
    expect(DRIVER_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/history',
      '/earnings',
      '/profile',
      '/settings',
    ]);
  });

  it('marks root active only at the root path', () => {
    const root = DRIVER_NAV_ITEMS[0];
    const earnings = DRIVER_NAV_ITEMS.find((item) => item.href === '/earnings');

    expect(isDriverNavActive('/', root)).toBe(true);
    expect(isDriverNavActive('/earnings', root)).toBe(false);
    expect(earnings ? isDriverNavActive('/earnings/payouts', earnings) : false).toBe(true);
  });

  it('renders desktop and mobile navigation from the same nav source', () => {
    pathname = '/earnings';

    render(
      <DriverShell title="Earnings">
        <p>Driver earnings content</p>
      </DriverShell>,
    );

    expect(screen.getByRole('heading', { name: 'Earnings' })).toBeInTheDocument();
    expect(screen.getByText('Driver earnings content')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /earnings/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThanOrEqual(2);
  });
});
