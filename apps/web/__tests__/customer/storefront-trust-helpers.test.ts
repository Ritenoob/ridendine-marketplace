/**
 * @jest-environment node
 */
import {
  buildStorefrontTrustHighlights,
  formatFavoriteRating,
  formatStorefrontDeliveryEta,
  formatStorefrontRating,
  mapFavoriteStorefront,
} from '@/lib/storefront-trust';

describe('storefront trust helpers', () => {
  it('formats delivery ETA using prep time plus delivery buffer', () => {
    expect(formatStorefrontDeliveryEta(15, 35)).toBe('30-55 min delivery');
  });

  it('formats rating confidence copy', () => {
    expect(formatStorefrontRating(4.7, 18)).toBe('4.7 from 18 reviews');
    expect(formatStorefrontRating(null, 0)).toBe('New chef on RideNDine');
    expect(formatFavoriteRating(4.5, 1)).toBe('4.5 (1 review)');
  });

  it('builds trust highlights from existing storefront data', () => {
    const highlights = buildStorefrontTrustHighlights({
      chefName: 'Asha',
      averageRating: 4.8,
      totalReviews: 22,
      estimatedPrepTimeMin: 15,
      estimatedPrepTimeMax: 35,
      minOrderAmount: 25,
    });

    expect(highlights.map((item) => item.label)).toEqual([
      'Approved chef',
      'Customer-rated',
      'Clear timing',
      'Secure checkout',
    ]);
    expect(highlights[0].value).toBe('Asha');
    expect(highlights[1].value).toBe('4.8 from 22 reviews');
    expect(highlights[2].value).toBe('30-55 min delivery');
    expect(highlights[3].detail).toContain('server-confirmed fees');
  });

  it('maps favorite API rows into renderable storefront cards', () => {
    expect(
      mapFavoriteStorefront({
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
      }),
    ).toEqual({
      favoriteId: 'fav-1',
      storefrontId: 'sf-1',
      slug: 'every-bite-yum',
      name: 'Every Bite Yum',
      cuisines: ['Indian', 'Comfort'],
      ratingText: '4.9 (33 reviews)',
      logoUrl: null,
      coverImageUrl: 'https://example.com/cover.jpg',
    });
  });
});
