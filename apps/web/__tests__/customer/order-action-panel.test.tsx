/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrderActionPanel } from '../../src/components/orders/order-action-panel';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@ridendine/ui', () => ({
  buttonVariants: ({ variant, size }: { variant?: string; size?: string }) => `button-${variant}-${size}`,
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
}));

describe('OrderActionPanel', () => {
  it('shows order context, support handoff, and browse action', () => {
    render(
      <OrderActionPanel
        orderNumber="RD-1001"
        storefrontName="Every Bite Yum"
        status="preparing"
        publicStage="cooking"
      />
    );

    expect(screen.getByText('Order RD-1001')).toBeInTheDocument();
    expect(screen.getByText('Every Bite Yum')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact support/i })).toHaveAttribute(
      'href',
      '/contact?orderNumber=RD-1001&subject=Help%20with%20order%20RD-1001'
    );
    expect(screen.getByRole('link', { name: /keep browsing/i })).toHaveAttribute('href', '/chefs');
  });

  it('shows review and reorder prompts for delivered orders', () => {
    render(
      <OrderActionPanel
        orderNumber="RD-1002"
        storefrontName="Every Bite Yum"
        status="completed"
        publicStage="delivered"
      />
    );

    expect(screen.getByRole('link', { name: /leave a review/i })).toHaveAttribute('href', '#review');
    expect(screen.getByRole('link', { name: /reorder from history/i })).toHaveAttribute('href', '/account/orders');
  });
});
