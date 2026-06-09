/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrderConfirmationHero } from '../../src/components/orders/order-confirmation-hero';

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
}));

describe('OrderConfirmationHero', () => {
  it('summarizes receipt, kitchen, ETA, and driver context after checkout', () => {
    render(
      <OrderConfirmationHero
        orderNumber="RD-1001"
        total={42.5}
        storefrontName="Every Bite Yum"
        estimatedDeliveryMinutes={38}
        driverFirstName="Sean"
      />
    );

    expect(screen.getByRole('heading', { name: /order confirmed/i })).toBeInTheDocument();
    expect(screen.getByText('Receipt sent')).toBeInTheDocument();
    expect(screen.getByText('Order RD-1001')).toBeInTheDocument();
    expect(screen.getByText('$42.50')).toBeInTheDocument();
    expect(screen.getByText('Every Bite Yum')).toBeInTheDocument();
    expect(screen.getByText('38 min')).toBeInTheDocument();
    expect(screen.getByText('Sean')).toBeInTheDocument();
  });
});
