import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/customers',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@ridendine/db', () => ({
  createBrowserClient: () => null,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { DashboardLayout } from '../DashboardLayout';

describe('DashboardLayout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders persisted closed groups as open on the first client render to avoid hydration drift', () => {
    window.localStorage.setItem('opsadmin.nav.people', 'false');

    render(
      <DashboardLayout>
        <p>Content</p>
      </DashboardLayout>
    );

    expect(screen.getByText('People').closest('button')).toHaveAttribute('aria-expanded', 'true');
  });
});
