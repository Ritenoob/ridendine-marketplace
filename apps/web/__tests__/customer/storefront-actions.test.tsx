/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StorefrontActions } from '../../src/components/storefront/storefront-actions';

jest.mock('@ridendine/ui', () => ({
  Button: ({
    children,
    disabled,
    loading,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    'aria-label'?: string;
  }) => (
    <button aria-label={ariaLabel} disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
}));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe('StorefrontActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('loads existing favorite state and removes a saved storefront on click', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ storefront: { id: 'sf-1' } }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, action: 'removed' }));
    global.fetch = fetchMock;

    render(
      <StorefrontActions
        storefrontId="sf-1"
        storefrontName="Every Bite Yum"
        storefrontSlug="every-bite-yum"
      />,
    );

    const button = await screen.findByRole('button', { name: /remove every bite yum from favorites/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/favorites', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ storefrontId: 'sf-1' }),
      }));
    });
    expect(await screen.findByRole('button', { name: /save every bite yum to favorites/i })).toBeInTheDocument();
  });

  it('shows sign-in guidance when favorite toggle is unauthorized', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401));
    global.fetch = fetchMock;

    render(
      <StorefrontActions
        storefrontId="sf-1"
        storefrontName="Every Bite Yum"
        storefrontSlug="every-bite-yum"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save every bite yum to favorites/i }));

    expect(await screen.findByText(/sign in to save every bite yum/i)).toBeInTheDocument();
  });
});
