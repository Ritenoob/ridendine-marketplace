'use client';

import { useEffect, useState } from 'react';
import { Button } from '@ridendine/ui';

interface StorefrontActionsProps {
  storefrontId: string;
  storefrontName: string;
  storefrontSlug: string;
}

interface FavoritesResponse {
  success?: boolean;
  data?: Array<{ storefront?: { id?: string } | null }>;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

export function StorefrontActions({ storefrontId, storefrontName, storefrontSlug }: StorefrontActionsProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteState() {
      try {
        const response = await fetch('/api/favorites');
        if (!response.ok) return;
        const payload = (await response.json()) as FavoritesResponse;
        const saved = Boolean(
          payload.data?.some((row) => row.storefront?.id === storefrontId),
        );
        if (isMounted) setIsFavorited(saved);
      } catch {
        // Favorite state is optional on public storefront pages.
      }
    }

    void loadFavoriteState();
    return () => {
      isMounted = false;
    };
  }, [storefrontId]);

  const handleFavorite = async () => {
    setLoadingFavorite(true);
    setMessage(null);

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storefrontId }),
      });

      if (response.status === 401) {
        setMessage(`Sign in to save ${storefrontName} to your favorites.`);
        return;
      }

      const payload = await response.json().catch(() => null) as { action?: 'added' | 'removed'; error?: string } | null;
      if (!response.ok || !payload) {
        setMessage(payload?.error || 'Unable to update favorites right now.');
        return;
      }

      const nextFavorited = payload.action === 'added';
      setIsFavorited(nextFavorited);
      setMessage(nextFavorited ? `${storefrontName} saved to favorites.` : `${storefrontName} removed from favorites.`);
    } catch {
      setMessage('Unable to update favorites right now.');
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/chefs/${storefrontSlug}`
      : `/chefs/${storefrontSlug}`;
    const nav = navigator as Navigator & {
      share?: (data: { title: string; url: string }) => Promise<void>;
    };

    try {
      if (nav.share) {
        await nav.share({ title: storefrontName, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage('Storefront link copied.');
      }
    } catch {
      setMessage('Unable to share this storefront right now.');
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          loading={loadingFavorite}
          aria-pressed={isFavorited}
          aria-label={isFavorited ? `Remove ${storefrontName} from favorites` : `Save ${storefrontName} to favorites`}
          onClick={handleFavorite}
        >
          <HeartIcon filled={isFavorited} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Share ${storefrontName}`}
          onClick={handleShare}
        >
          <ShareIcon />
        </Button>
      </div>
      {message && (
        <p className="max-w-[14rem] text-right text-xs leading-relaxed text-textMuted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
