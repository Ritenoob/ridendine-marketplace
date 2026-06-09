/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CheckoutProgress } from '../../src/components/checkout/checkout-progress';

describe('CheckoutProgress', () => {
  it('renders the customer checkout steps', () => {
    render(<CheckoutProgress activeStep="details" />);

    expect(screen.getByText('Delivery details')).toBeInTheDocument();
    expect(screen.getByText('Secure payment')).toBeInTheDocument();
  });

  it('marks delivery details as the current step when collecting details', () => {
    render(<CheckoutProgress activeStep="details" />);

    expect(screen.getByText('Delivery details').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Secure payment').closest('li')).not.toHaveAttribute('aria-current');
  });

  it('marks secure payment as the current step during payment', () => {
    render(<CheckoutProgress activeStep="payment" />);

    expect(screen.getByText('Secure payment').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
