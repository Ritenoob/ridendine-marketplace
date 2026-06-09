import Link from 'next/link';
import { Badge } from '@ridendine/ui';
import { buildStorefrontTrustHighlights } from '@/lib/storefront-trust';

interface StorefrontTrustPanelProps {
  storefront: {
    name: string;
    description?: string | null;
    cuisineTypes: string[];
    averageRating?: number | null;
    totalReviews: number;
    estimatedPrepTimeMin: number;
    estimatedPrepTimeMax: number;
    minOrderAmount: number;
    chef: {
      displayName: string;
      profileImageUrl?: string | null;
    };
  };
}

export function StorefrontTrustPanel({ storefront }: StorefrontTrustPanelProps) {
  const highlights = buildStorefrontTrustHighlights({
    chefName: storefront.chef.displayName,
    averageRating: storefront.averageRating,
    totalReviews: storefront.totalReviews,
    estimatedPrepTimeMin: storefront.estimatedPrepTimeMin,
    estimatedPrepTimeMax: storefront.estimatedPrepTimeMax,
    minOrderAmount: storefront.minOrderAmount,
  });

  return (
    <section className="border-b border-border bg-background py-6" aria-labelledby="storefront-trust-heading">
      <div className="container">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Chef-first ordering</p>
            <h2 id="storefront-trust-heading" className="mt-1 font-display text-xl font-bold tracking-tight text-text">
              Why customers order from {storefront.name}
            </h2>
            {storefront.description && (
              <p className="mt-2 text-sm leading-relaxed text-textMuted">
                {storefront.description}
              </p>
            )}
            {storefront.cuisineTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {storefront.cuisineTypes.map((cuisine) => (
                  <Badge key={cuisine} tone="accent" size="sm">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            )}
            <Link
              href="#reviews"
              className="mt-4 inline-flex text-sm font-semibold text-primary transition-colors hover:underline"
            >
              Read customer reviews
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-textSubtle">{item.label}</p>
                <p className="mt-1 font-semibold text-text">{item.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-textMuted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
