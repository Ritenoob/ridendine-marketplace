/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Next.js
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Mock AuthLayout
jest.mock('../../src/components/auth/auth-layout', () => ({
  AuthLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

// Mock UI components — pass error/valid props through to inputs
jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    loading,
    ...props
  }: {
    children: React.ReactNode;
    loading?: boolean;
    [key: string]: unknown;
  }) => (
    <button {...props} disabled={!!loading}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({
    label,
    error,
    valid,
    ...props
  }: {
    label?: string;
    error?: string;
    valid?: boolean;
    [key: string]: unknown;
  }) => (
    <div>
      {label && <label>{label}</label>}
      <input
        data-error={error || ''}
        data-valid={valid ? 'true' : ''}
        className={error ? 'border-red-500' : valid ? 'border-green-500' : ''}
        {...props}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

import LoginPage from '../../src/app/auth/login/page';

describe('LoginPage inline validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows email error when submitting empty email', async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows email format error for invalid email', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('shows password error when submitting empty password', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows green border on valid email after blur', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('data-valid', 'true');
    });
  });

  it('clears field error when user corrects input', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'bad' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
    });

    fireEvent.change(emailInput, { target: { value: 'good@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText(/enter a valid email/i)).not.toBeInTheDocument();
    });
  });

  it('does not call fetch when form has validation errors', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch when form is valid', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
