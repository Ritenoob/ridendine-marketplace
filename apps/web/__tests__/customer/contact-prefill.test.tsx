/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ContactPage from '../../src/app/contact/page';

const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockGet(key),
  }),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    fullWidth,
    loading,
    type,
  }: {
    children: React.ReactNode;
    fullWidth?: boolean;
    loading?: boolean;
    type?: 'submit' | 'button';
  }) => (
    <button data-full-width={fullWidth} disabled={loading} type={type}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  Input: ({
    label,
    value,
    onChange,
    placeholder,
    required,
    type = 'text',
  }: {
    label: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    type?: string;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  ),
  Textarea: ({
    label,
    value,
    onChange,
    placeholder,
    required,
    rows,
  }: {
    label: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    required?: boolean;
    rows?: number;
  }) => (
    <label>
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    </label>
  ),
}));

describe('ContactPage order support prefill', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('prefills order number and subject from support query params', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'orderNumber') return 'RD-1001';
      if (key === 'subject') return 'Help with order RD-1001';
      return null;
    });

    render(<ContactPage />);

    expect(screen.getByLabelText('Order Number (optional)')).toHaveValue('RD-1001');
    expect(screen.getByLabelText('Subject')).toHaveValue('Help with order RD-1001');
  });

  it('keeps order and subject blank without support query params', () => {
    mockGet.mockReturnValue(null);

    render(<ContactPage />);

    expect(screen.getByLabelText('Order Number (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Subject')).toHaveValue('');
  });
});
