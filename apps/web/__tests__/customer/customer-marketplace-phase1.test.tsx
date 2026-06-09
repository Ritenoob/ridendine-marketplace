/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerMarketplaceHero } from '../../src/components/home/customer-marketplace-hero';
import { ChefsFilters } from '../../src/components/chefs/chefs-filters';

const pushMock = jest.fn();
const searchValues = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => searchValues.get(key),
    getAll: (key: string) => searchValues.getAll(key),
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

jest.mock('@ridendine/ui', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Button: ({
    children,
    className,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button className={className} onClick={onClick} type={type}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
    <label>
      {props.label}
      <input {...props} />
    </label>
  ),
  Select: ({
    children,
    label,
    value,
    onChange,
  }: {
    children: React.ReactNode;
    label?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  }) => (
    <label>
      {label}
      <select value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  ),
}));

describe('CustomerMarketplaceHero', () => {
  it('keeps the RideNDine warm marketplace color structure', () => {
    const { container } = render(<CustomerMarketplaceHero activeChefs={4} liveMenuItems={12} />);
    const section = container.querySelector('[data-testid="customer-marketplace-hero"]');
    expect(section).toHaveClass('bg-background');
    expect(section?.textContent).toContain('Hamilton');
    expect(section?.textContent).toContain('Local Chefs');
  });

  it('submits customer search to chef discovery', () => {
    render(<CustomerMarketplaceHero activeChefs={4} liveMenuItems={12} />);
    const form = screen.getByTestId('customer-marketplace-search-form');
    expect(form).toHaveAttribute('action', '/chefs');
    expect(screen.getByPlaceholderText('Search dishes, chefs, or cuisines')).toHaveAttribute('name', 'search');
  });

  it('renders cuisine chips that deep-link to discovery', () => {
    render(<CustomerMarketplaceHero activeChefs={4} liveMenuItems={12} />);
    expect(screen.getByRole('link', { name: 'Vietnamese' })).toHaveAttribute('href', '/chefs?cuisine=Vietnamese');
    expect(screen.getByRole('link', { name: 'Burgers' })).toHaveAttribute('href', '/chefs?cuisine=American');
  });
});

describe('ChefsFilters Phase 1 controls', () => {
  beforeEach(() => {
    pushMock.mockClear();
    Array.from(searchValues.keys()).forEach((key) => searchValues.delete(key));
  });

  it('offers fastest delivery sorting', () => {
    render(<ChefsFilters />);
    expect(screen.getByRole('option', { name: 'Fastest Delivery' })).toHaveAttribute('value', 'fastest');
  });

  it('offers an open-now filter', () => {
    render(<ChefsFilters />);
    expect(screen.getByLabelText('Open now')).toBeInTheDocument();
  });
});
