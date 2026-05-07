/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../src/components/auth/auth-layout', () => ({
  AuthLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const mockSignUp = jest.fn();

jest.mock('@ridendine/auth', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    loading: false,
    error: null,
  }),
}));

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
    name,
    ...props
  }: {
    label?: string;
    error?: string;
    valid?: boolean;
    name?: string;
    [key: string]: unknown;
  }) => (
    <div>
      {label && <label>{label}</label>}
      <input
        name={name}
        data-error={error || ''}
        data-valid={valid ? 'true' : ''}
        className={error ? 'border-red-500' : valid ? 'border-green-500' : ''}
        {...props}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  ),
  PasswordStrength: ({ password }: { password: string }) => (
    <div data-testid="password-strength">{password.length > 0 ? 'strength-bar' : ''}</div>
  ),
}));

import SignupPage from '../../src/app/auth/signup/page';

describe('SignupPage inline validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows first name error on submit when empty', async () => {
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  it('shows email error on blur for invalid email', async () => {
    render(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'bademail' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('shows password length error on blur for short password', async () => {
    render(<SignupPage />);

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'short' } });
    fireEvent.blur(passwordInputs[0]);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows confirm password mismatch error on blur', async () => {
    render(<SignupPage />);

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'different123' } });
    fireEvent.blur(passwordInputs[1]);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows green border on valid email after blur', async () => {
    render(<SignupPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveAttribute('data-valid', 'true');
    });
  });

  it('does not call signUp when form has validation errors', async () => {
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp when all fields are valid and terms accepted', async () => {
    mockSignUp.mockResolvedValueOnce({ success: true });

    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'jane@example.com' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'securepass1' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'securepass1' } });

    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'jane@example.com',
        'securepass1',
        expect.objectContaining({ first_name: 'Jane', last_name: 'Smith' })
      );
    });
  });
});
