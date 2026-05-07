/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectOnboarding } from '../components/profile/connect-onboarding';

// Mock @ridendine/ui to keep tests simple
jest.mock('@ridendine/ui', () => ({
  Button: ({ children, onClick, disabled, className, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

describe('ConnectOnboarding', () => {
  const mockOnSetup = jest.fn();

  beforeEach(() => {
    mockOnSetup.mockClear();
  });

  describe('not_started status', () => {
    it('shows call-to-action message when not started', () => {
      render(
        <ConnectOnboarding status="not_started" onSetup={mockOnSetup} />
      );
      expect(screen.getByText(/connect your bank account/i)).toBeInTheDocument();
    });

    it('shows Set Up Payouts button when not started', () => {
      render(
        <ConnectOnboarding status="not_started" onSetup={mockOnSetup} />
      );
      expect(screen.getByText('Set Up Payouts')).toBeInTheDocument();
    });

    it('calls onSetup when button is clicked', () => {
      render(
        <ConnectOnboarding status="not_started" onSetup={mockOnSetup} />
      );
      fireEvent.click(screen.getByText('Set Up Payouts'));
      expect(mockOnSetup).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when isLoading is true', () => {
      render(
        <ConnectOnboarding status="not_started" isLoading onSetup={mockOnSetup} />
      );
      expect(screen.getByText('Setting up...')).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(
        <ConnectOnboarding status="not_started" isLoading onSetup={mockOnSetup} />
      );
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('pending status', () => {
    it('shows pending badge', () => {
      render(
        <ConnectOnboarding status="pending" stripeAccountId="acct_test123" onSetup={mockOnSetup} />
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent(/pending/i);
    });

    it('shows stripe account id truncated', () => {
      render(
        <ConnectOnboarding status="pending" stripeAccountId="acct_test123456" onSetup={mockOnSetup} />
      );
      expect(screen.getByText('acct_test123...')).toBeInTheDocument();
    });

    it('shows Complete Verification button for pending status', () => {
      render(
        <ConnectOnboarding status="pending" stripeAccountId="acct_test123" onSetup={mockOnSetup} />
      );
      expect(screen.getByText('Complete Verification')).toBeInTheDocument();
    });
  });

  describe('active status', () => {
    it('shows active badge', () => {
      render(
        <ConnectOnboarding status="active" stripeAccountId="acct_test123" onSetup={mockOnSetup} />
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Active');
    });

    it('does not show a setup button when active', () => {
      render(
        <ConnectOnboarding status="active" stripeAccountId="acct_test123" onSetup={mockOnSetup} />
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
