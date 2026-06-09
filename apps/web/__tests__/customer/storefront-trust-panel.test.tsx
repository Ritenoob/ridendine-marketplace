/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StorefrontTrustPanel } from '../../src/components/storefront/storefront-trust-panel';

jest.mock('@ridendine/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const storefront = {
  name: 'Every Bite Yum',
  description: 'Home-cooked comfort meals with bright Hamilton flavour.',
  cuisineTypes: ['Indian', 'Comfort'],
  averageRating: 4.8,
  totalReviews: 22,
  estimatedPrepTimeMin: 15,
  estimatedPrepTimeMax: 35,
  minOrderAmount: 25,
  chef: {
    displayName: 'Asha',
    profileImageUrl: null,
  },
};

describe('StorefrontTrustPanel', () => {
  it('renders customer trust proof from storefront data', () => {
    render(<StorefrontTrustPanel storefront={storefront} />);

    expect(screen.getByRole('heading', { name: /why customers order from every bite yum/i })).toBeInTheDocument();
    expect(screen.getByText('Approved chef')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Customer-rated')).toBeInTheDocument();
    expect(screen.getByText('4.8 from 22 reviews')).toBeInTheDocument();
    expect(screen.getByText('Clear timing')).toBeInTheDocument();
    expect(screen.getByText('30-55 min delivery')).toBeInTheDocument();
    expect(screen.getByText('Secure checkout')).toBeInTheDocument();
    expect(screen.getByText(/server-confirmed fees/i)).toBeInTheDocument();
  });

  it('links customers directly to storefront reviews', () => {
    render(<StorefrontTrustPanel storefront={storefront} />);

    expect(screen.getByRole('link', { name: /read customer reviews/i })).toHaveAttribute('href', '#reviews');
  });
});
