/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationPreferences } from '../components/settings/notification-preferences';

jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
}));

const defaultPreferences = {
  new_order: { email: true, sms: true },
  order_accepted: { email: true, sms: true },
  order_ready: { email: true, sms: true },
  delivery_offer: { email: true, sms: true },
  delivery_assigned: { email: true, sms: true },
  payment_received: { email: true, sms: true },
};

describe('NotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { preferences: defaultPreferences, source: 'database' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            preferences: {
              ...defaultPreferences,
              delivery_offer: { email: true, sms: false },
            },
          },
        }),
      }) as jest.Mock;
  });

  it('loads preferences from the API and saves changed driver preferences back to the API', async () => {
    render(<NotificationPreferences />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/driver/notification-preferences');
    });
    expect(screen.queryByText(/stored locally/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: /delivery offer sms/i }));
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/driver/notification-preferences',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"delivery_offer":{"email":true,"sms":false}'),
        })
      );
    });
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });
});
