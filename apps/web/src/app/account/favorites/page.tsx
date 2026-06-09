'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import {
  type FavoriteApiRow,
  type FavoriteStorefrontCard,
  mapFavoriteStorefront,
} from '@/lib/storefront-trust';
import { Button, Card, EmptyState, Spinner } from '@ridendine/ui';

interface FavoritesResponse {
  success?: boolean;
  data?: FavoriteApiRow[];
  error?: string;
}

function FavoriteCard({
  favorite,
  removing,
  onRemove,
}: {
  favorite: FavoriteStorefrontCard;
  removing: boolean;
  onRemove: (favorite: FavoriteStorefrontCard) => void;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="aspect-[16/9] overflow-hidden bg-primarySoft">
        {favorite.coverImageUrl && (
          <img
            src={favorite.coverImageUrl}
            alt={`${favorite.name} cover`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-lg font-bold text-primaryFg">
            {favorite.logoUrl ? (
              <img src={favorite.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              favorite.name.charAt(0)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-text">{favorite.name}</h2>
            <p className="mt-0.5 text-sm text-textMuted">{favorite.ratingText}</p>
          </div>
        </div>

        {favorite.cuisines.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {favorite.cuisines.map((cuisine) => (
              <span key={cuisine} className="rounded-md bg-accentSoft px-2 py-1 text-xs font-semibold text-accent">
                {cuisine}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/chefs/${favorite.slug}`}>
            <Button variant="primary" size="sm">
              View menu
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={removing}
            aria-label={`Remove ${favorite.name}`}
            onClick={() => onRemove(favorite)}
          >
            Remove
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const [favorites, setFavorites] = useState<FavoriteStorefrontCard[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (loading) return;

    let isMounted = true;
    async function fetchFavorites() {
      setLoadingFavorites(true);
      setError(null);

      try {
        const response = await fetch('/api/favorites');
        const json = (await response.json()) as FavoritesResponse;
        if (!response.ok || !json.success) {
          setError(json.error || 'Unable to load favorites');
          return;
        }

        const mapped = (json.data ?? [])
          .map(mapFavoriteStorefront)
          .filter((favorite): favorite is FavoriteStorefrontCard => favorite !== null);
        if (isMounted) setFavorites(mapped);
      } catch {
        if (isMounted) setError('Unable to load favorites right now');
      } finally {
        if (isMounted) setLoadingFavorites(false);
      }
    }

    void fetchFavorites();
    return () => {
      isMounted = false;
    };
  }, [loading, router, user]);

  const handleRemove = async (favorite: FavoriteStorefrontCard) => {
    setRemovingId(favorite.storefrontId);
    setError(null);

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontId: favorite.storefrontId }),
      });
      const json = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(json?.error || 'Unable to remove favorite');
        return;
      }
      setFavorites((current) => current.filter((item) => item.storefrontId !== favorite.storefrontId));
    } catch {
      setError('Unable to remove favorite right now');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text">
              My Favorites
            </h1>
            <p className="mt-1 text-base leading-relaxed text-textMuted">
              Saved chefs you can return to quickly
            </p>
          </div>
          <Link href="/account">
            <Button variant="secondary">Back to Account</Button>
          </Link>
        </div>

        {loadingFavorites ? (
          <Card padding="lg">
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          </Card>
        ) : error ? (
          <Card padding="lg">
            <p className="text-sm text-danger">{error}</p>
          </Card>
        ) : favorites.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              }
              title="No favorites yet"
              description="Save your favorite chefs to find them easily later"
              action={
                <Link href="/chefs">
                  <Button variant="primary">Browse Chefs</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((favorite) => (
              <FavoriteCard
                key={favorite.storefrontId}
                favorite={favorite}
                removing={removingId === favorite.storefrontId}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text">How favorites help</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-textMuted">
            <li className="flex gap-2">
              <span className="font-semibold text-primary">•</span>
              <span>Save a chef from their storefront with the heart button</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">•</span>
              <span>Come back here to start from your trusted kitchens</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">•</span>
              <span>Use order history to reorder delivered meals through the current cart</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
