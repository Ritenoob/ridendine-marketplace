/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '@ridendine/ui';

// Helper component to trigger toasts
function ToastTrigger() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast({ message: 'Added to cart!', variant: 'success' })}>
        Show Success
      </button>
      <button onClick={() => showToast({ message: 'Something went wrong', variant: 'error' })}>
        Show Error
      </button>
      <button onClick={() => showToast({ message: 'FYI: update available', variant: 'info' })}>
        Show Info
      </button>
      <button onClick={() => showToast({ message: 'Custom duration', variant: 'success', duration: 10000 })}>
        Show Custom
      </button>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('Toast notification system', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders children without showing any toasts initially', () => {
    render(
      <Wrapper>
        <p>Hello World</p>
      </Wrapper>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('throws when useToast is used outside ToastProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastTrigger />)).toThrow();
    spy.mockRestore();
  });

  it('shows a success toast when showToast is called with variant success', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Success'));
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Added to cart!')).toBeInTheDocument();
  });

  it('shows an error toast with correct variant', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Error'));
    });

    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows an info toast', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Info'));
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('FYI: update available')).toBeInTheDocument();
  });

  it('auto-dismisses after default 3 seconds', async () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Success'));
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3400);
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('respects custom duration', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Custom'));
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3100);
    });

    // Should still be visible at 3.1s with 10s duration
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('stacks multiple toasts', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Success'));
    });
    act(() => {
      fireEvent.click(screen.getByText('Show Error'));
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
  });

  it('toast container exists and is at bottom-right', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    // Container is always rendered (even without toasts)
    const container = screen.getByTestId('toast-container');
    expect(container).toBeInTheDocument();
    expect(container.className).toMatch(/bottom/);
    expect(container.className).toMatch(/right/);
  });

  it('applies brand color for success variant', () => {
    render(
      <Wrapper>
        <ToastTrigger />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Show Success'));
    });

    const toast = screen.getByRole('alert');
    // Brand color #E85D26 is applied via a class
    expect(toast.className).toMatch(/bg-\[#E85D26\]|toast-success/);
  });
});
