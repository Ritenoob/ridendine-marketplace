const TYPICAL_DRIVE_MINUTES = 15;
const DELIVERY_BUFFER_MINUTES = 5;

export interface StorefrontTrustInput {
  chefName: string;
  averageRating?: number | null;
  totalReviews: number;
  estimatedPrepTimeMin: number;
  estimatedPrepTimeMax: number;
  minOrderAmount: number;
}

export interface StorefrontTrustHighlight {
  label: string;
  value: string;
  detail: string;
}

export interface FavoriteApiRow {
  id: string;
  created_at: string;
  storefront: {
    id: string;
    slug: string;
    name: string;
    cuisine_types: string[] | null;
    average_rating: number | null;
    total_reviews: number | null;
    logo_url: string | null;
    cover_image_url: string | null;
  } | null;
}

export interface FavoriteStorefrontCard {
  favoriteId: string;
  storefrontId: string;
  slug: string;
  name: string;
  cuisines: string[];
  ratingText: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
}

export function formatStorefrontDeliveryEta(prepMin: number, prepMax: number): string {
  const min = prepMin + TYPICAL_DRIVE_MINUTES;
  const max = prepMax + TYPICAL_DRIVE_MINUTES + DELIVERY_BUFFER_MINUTES;
  return `${min}-${max} min delivery`;
}

export function formatStorefrontRating(rating?: number | null, reviewCount = 0): string {
  if (!rating || reviewCount <= 0) return 'New chef on RideNDine';
  return `${Number(rating).toFixed(1)} from ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`;
}

export function formatFavoriteRating(rating?: number | null, reviewCount = 0): string {
  if (!rating || reviewCount <= 0) return 'New chef';
  return `${Number(rating).toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`;
}

export function buildStorefrontTrustHighlights(input: StorefrontTrustInput): StorefrontTrustHighlight[] {
  return [
    {
      label: 'Approved chef',
      value: input.chefName,
      detail: 'RideNDine approves chef storefronts before customers can order.',
    },
    {
      label: 'Customer-rated',
      value: formatStorefrontRating(input.averageRating, input.totalReviews),
      detail: 'Reviews come from customers after completed orders.',
    },
    {
      label: 'Clear timing',
      value: formatStorefrontDeliveryEta(input.estimatedPrepTimeMin, input.estimatedPrepTimeMax),
      detail: `${input.estimatedPrepTimeMin}-${input.estimatedPrepTimeMax} min prep with delivery timing shown up front.`,
    },
    {
      label: 'Secure checkout',
      value: input.minOrderAmount > 0 ? `Min. $${Number(input.minOrderAmount).toFixed(2)}` : 'No minimum order',
      detail: 'Payment uses secure checkout with server-confirmed fees, tax, discounts, and total.',
    },
  ];
}

export function mapFavoriteStorefront(row: FavoriteApiRow): FavoriteStorefrontCard | null {
  if (!row.storefront) return null;

  return {
    favoriteId: row.id,
    storefrontId: row.storefront.id,
    slug: row.storefront.slug,
    name: row.storefront.name,
    cuisines: row.storefront.cuisine_types ?? [],
    ratingText: formatFavoriteRating(row.storefront.average_rating, row.storefront.total_reviews ?? 0),
    logoUrl: row.storefront.logo_url,
    coverImageUrl: row.storefront.cover_image_url,
  };
}
