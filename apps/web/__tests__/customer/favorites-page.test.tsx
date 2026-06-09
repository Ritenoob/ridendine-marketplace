/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FavoritesPage from '../../src/app/account/favorites/page';

const replace = jest.fn();
const mockUseAuthContext = jest.fn();
const routerMock = { replace };

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

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
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  ),
  Spinner: () => <div role="status">Loading</div>,
}));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

const favoriteRow = {
  id: 'fav-1',
  created_at: '2026-06-09T12:00:00Z',
  storefront: {
    id: 'sf-1',
    slug: 'every-bite-yum',
    name: 'Every Bite Yum',
    cuisine_types: ['Indian', 'Comfort'],
    average_rating: 4.9,
    total_reviews: 33,
    logo_url: null,
    cover_image_url: 'https://example.com/cover.jpg',
  },
};

describe('FavoritesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  });

  it('fetches and renders saved storefront cards for signed-in customers', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: true, data: [favoriteRow] }));

    render(<FavoritesPage />);

    expect(await screen.findByText('Every Bite Yum')).toBeInTheDocument();
    expect(screen.getByText('Indian')).toBeInTheDocument();
    expect(screen.getByText('Comfort')).toBeInTheDocument();
    expect(screen.getByText('4.9 (33 reviews)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view menu/i })).toHaveAttribute('href', '/chefs/every-bite-yum');
    expect(global.fetch).toHaveBeenCalledWith('/api/favorites');
  });

  it('shows the empty state when no favorites are saved', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: true, data: [] }));

    render(<FavoritesPage />);

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
  });

  it('removes a saved storefront from the page', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [favoriteRow] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, action: 'removed' }));
    global.fetch = fetchMock;

    render(<FavoritesPage />);

    expect(await screen.findByText('Every Bite Yum')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove every bite yum/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/favorites', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ storefrontId: 'sf-1' }),
      }));
    });
    await waitFor(() => {
      expect(screen.queryByText('Every Bite Yum')).not.toBeInTheDocument();
    });
  });
});
