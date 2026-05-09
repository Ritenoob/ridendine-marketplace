/** @jest-environment jsdom */
// Tests for Cancel Order UI in LiveOrderTracker
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseOrderStream = jest.fn();

jest.mock('@/lib/orders/use-order-stream', () => ({
  useOrderStream: (...args: unknown[]) => mockUseOrderStream(...args),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    function Dyn() {
      return <div data-testid="order-tracking-map" />;
    }
    return Dyn;
  },
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    variant,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-variant={variant}
      {...rest}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

// Mock fetch globally
global.fetch = jest.fn();

import { LiveOrderTracker } from '../../../src/components/tracking/live-order-tracker';

const streamBase = {
  stage: null as string | null,
  etaPickupAt: null as string | null,
  etaDropoffAt: null as string | null,
  progressPct: null as number | null,
  remainingSeconds: null as number | null,
  routePolyline: null as string | null,
  legacyStatus: null as string | null,
  isLive: true,
  error: null as string | null,
  refresh: jest.fn(),
};

const defaultProps = {
  orderId: 'order-123',
  orderNumber: 'RD-001',
  initialStatus: 'pending',
  initialPublicStage: 'placed' as string | null,
  deliveryId: null as string | null,
  pickupAddress: '123 Chef St',
  dropoffAddress: '456 Customer Ave',
  estimatedDeliveryMinutes: 30,
  storefrontName: "Chef Mario's Kitchen",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOrderStream.mockImplementation(() => ({ ...streamBase }));
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { orderId: 'order-123', message: 'Your payment will be refunded.' } }),
  });
});

describe('LiveOrderTracker — Cancel Order UI', () => {
  it('shows Cancel Order button when order is placed/pending', () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="pending" initialPublicStage="placed" />);
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
  });

  it('does NOT show Cancel Order button when order is cooking/accepted', () => {
    mockUseOrderStream.mockImplementation(() => ({
      ...streamBase,
      stage: 'cooking',
      legacyStatus: 'accepted',
    }));
    render(<LiveOrderTracker {...defaultProps} initialStatus="accepted" initialPublicStage="cooking" />);
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('does NOT show Cancel Order button when order is on_the_way', () => {
    mockUseOrderStream.mockImplementation(() => ({
      ...streamBase,
      stage: 'on_the_way',
      legacyStatus: 'picked_up',
    }));
    render(<LiveOrderTracker {...defaultProps} initialStatus="picked_up" initialPublicStage="on_the_way" />);
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('does NOT show Cancel Order button when order is delivered', () => {
    mockUseOrderStream.mockImplementation(() => ({
      ...streamBase,
      stage: 'delivered',
      legacyStatus: 'delivered',
    }));
    render(<LiveOrderTracker {...defaultProps} initialStatus="delivered" initialPublicStage="delivered" />);
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('does NOT show Cancel Order button when order is already cancelled', () => {
    mockUseOrderStream.mockImplementation(() => ({
      ...streamBase,
      stage: 'cancelled',
      legacyStatus: 'cancelled',
    }));
    render(<LiveOrderTracker {...defaultProps} initialStatus="cancelled" initialPublicStage="cancelled" />);
    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when Cancel Order button is clicked', async () => {
    render(<LiveOrderTracker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it('shows refund message in confirmation dialog', async () => {
    render(<LiveOrderTracker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => {
      expect(screen.getByText(/payment will be refunded/i)).toBeInTheDocument();
    });
  });

  it('dismisses dialog when user clicks No/Keep Order', async () => {
    render(<LiveOrderTracker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    const keepBtn = screen.getByRole('button', { name: /keep order/i });
    fireEvent.click(keepBtn);

    await waitFor(() => {
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  it('calls cancel API and shows success message on confirm', async () => {
    render(<LiveOrderTracker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/orders/order-123/cancel',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/refund/i)).toBeInTheDocument();
    });
  });

  it('shows error message when cancellation API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Cancel failed' } }),
    });

    render(<LiveOrderTracker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

    await waitFor(() => {
      expect(screen.getByText(/cancel failed|error|try again/i)).toBeInTheDocument();
    });
  });

  it('button is disabled while cancellation is loading', async () => {
    let resolveCancel!: (v: unknown) => void;
    const cancelPromise = new Promise((resolve) => {
      resolveCancel = resolve;
    });
    (global.fetch as jest.Mock).mockReturnValueOnce(cancelPromise);

    render(<LiveOrderTracker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

    // While pending, confirm button should be disabled (shows Loading...)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /yes, cancel|loading/i });
      expect(btn).toBeDisabled();
    });

    resolveCancel({
      ok: true,
      json: async () => ({ data: { orderId: 'order-123', message: 'refund pending' } }),
    });
  });
});
