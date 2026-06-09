/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FeaturedChefs } from '../../src/components/home/featured-chefs';
import { StorefrontHeader } from '../../src/components/storefront/storefront-header';
import FavoritesPage from '../../src/app/account/favorites/page';

const mockGetActiveStorefronts = jest.fn();
const replace = jest.fn();
const mockUseAuthContext = jest.fn();
const routerMock = { replace };

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({}),
}));

jest.mock('@ridendine/db', () => ({
  createServerClient: jest.fn(() => ({})),
  getActiveStorefronts: (...args: unknown[]) => mockGetActiveStorefronts(...args),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock('@/components/storefront/storefront-actions', () => ({
  StorefrontActions: () => <div data-testid="storefront-actions" />,
}));

jest.mock('@ridendine/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Spinner: () => <div role="status">Loading</div>,
}));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

const storefront = {
  id: 'sf-1',
  slug: 'every-bite-yum',
  name: 'Every Bite Yum',
  description: 'Smash burgers',
  cuisineTypes: ['American'],
  averageRating: 4.8,
  totalReviews: 47,
  estimatedPrepTimeMin: 20,
  estimatedPrepTimeMax: 35,
  minOrderAmount: 20,
  coverImageUrl: 'https://example.com/cover.jpg',
  logoUrl: 'https://example.com/logo.jpg',
  chef: {
    displayName: 'Sean',
    profileImageUrl: null,
  },
};

const storefrontRow = {
  id: storefront.id,
  slug: storefront.slug,
  name: storefront.name,
  cover_image_url: storefront.coverImageUrl,
  logo_url: storefront.logoUrl,
  average_rating: storefront.averageRating,
  total_reviews: storefront.totalReviews,
  cuisine_types: ['American'],
  estimated_prep_time_min: 20,
  estimated_prep_time_max: 35,
  chef_profiles: { display_name: 'Sean' },
};

describe('customer storefront image layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  });

  it('renders featured chef covers as real 16:9 images', async () => {
    mockGetActiveStorefronts.mockResolvedValue([storefrontRow]);

    render(await FeaturedChefs({ limit: 3 }));

    const image = screen.getByAltText('Every Bite Yum cover');
    expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
    expect(image.parentElement).toHaveClass('aspect-[16/9]');
  });

  it('renders featured chef card identity below the cover without a clipped overlap', async () => {
    mockGetActiveStorefronts.mockResolvedValue([storefrontRow]);

    render(await FeaturedChefs({ limit: 3 }));

    const coverImage = screen.getByAltText('Every Bite Yum cover');
    const cardBody = coverImage.parentElement?.nextElementSibling as HTMLElement | null;
    const logo = screen.getByAltText('Every Bite Yum logo');
    const bodyClassNames = Array.from(cardBody?.querySelectorAll('[class]') ?? [])
      .map((element) => element.getAttribute('class') ?? '')
      .flatMap((className) => className.split(/\s+/));

    expect(cardBody).toHaveClass('p-4');
    expect(cardBody).toContainElement(logo);
    expect(bodyClassNames).not.toContain('-mt-12');
  });

  it('renders storefront header covers in a stable 16:9 hero frame', () => {
    render(<StorefrontHeader storefront={storefront} />);

    const image = screen.getByAltText('Every Bite Yum cover');
    expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
    expect(image.parentElement).toHaveClass('aspect-[16/9]');
  });

  it('renders favorite storefront covers in stable 16:9 frames', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            id: 'fav-1',
            created_at: '2026-06-09T12:00:00Z',
            storefront: {
              id: storefront.id,
              slug: storefront.slug,
              name: storefront.name,
              cuisine_types: ['American'],
              average_rating: storefront.averageRating,
              total_reviews: storefront.totalReviews,
              logo_url: storefront.logoUrl,
              cover_image_url: storefront.coverImageUrl,
            },
          },
        ],
      })
    );

    render(<FavoritesPage />);

    await waitFor(() => {
      expect(screen.getByText('Every Bite Yum')).toBeInTheDocument();
    });

    const image = screen.getByAltText('Every Bite Yum cover');
    expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
    expect(image.parentElement).toHaveClass('aspect-[16/9]');
  });
});
