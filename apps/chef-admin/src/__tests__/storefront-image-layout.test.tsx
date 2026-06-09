/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StorefrontForm } from '../components/storefront/storefront-form';

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  Button: ({
    children,
    className,
    disabled,
    loading,
    type,
    variant,
    size,
  }: {
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit';
    variant?: string;
    size?: string;
  }) => (
    <button
      className={className}
      disabled={disabled || loading}
      type={type}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

const storefront = {
  id: 'sf-1',
  name: 'Every Bite Yum',
  slug: 'every-bite-yum',
  description: 'Hamilton burgers',
  cuisine_types: ['American'],
  cover_image_url: 'https://example.com/cover.jpg',
  logo_url: 'https://example.com/logo.jpg',
  min_order_amount: 20,
  estimated_prep_time_min: 20,
  estimated_prep_time_max: 35,
  is_active: true,
};

describe('chef storefront image layout', () => {
  it('shows square logo dimension guidance', () => {
    render(<StorefrontForm storefront={storefront} />);

    expect(screen.getByText('Recommended 512 x 512 px')).toBeInTheDocument();
    const logo = screen.getByAltText('Every Bite Yum logo');
    expect(logo).toHaveClass('h-full', 'w-full', 'object-cover');
  });

  it('shows customer-facing cover dimension guidance and a stable 16:9 preview', () => {
    render(<StorefrontForm storefront={storefront} />);

    expect(screen.getByText('Recommended 1600 x 900 px')).toBeInTheDocument();
    const cover = screen.getByAltText('Every Bite Yum cover');
    expect(cover).toHaveClass('h-full', 'w-full', 'object-cover');
    expect(cover.parentElement).toHaveClass('aspect-[16/9]');
  });
});
