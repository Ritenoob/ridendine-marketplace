export interface ChefAvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export type CustomerStorefrontSortBy = 'rating' | 'newest' | 'popular' | 'fastest' | 'default';

const SUPPORTED_SORTS = new Set<CustomerStorefrontSortBy>([
  'rating',
  'newest',
  'popular',
  'fastest',
  'default',
]);

export function normalizeStorefrontSort(value?: string | null): CustomerStorefrontSortBy {
  return value && SUPPORTED_SORTS.has(value as CustomerStorefrontSortBy)
    ? (value as CustomerStorefrontSortBy)
    : 'default';
}

export function isChefOpenNow(availability?: ChefAvailabilityRow[], now = new Date()): boolean {
  if (!availability || availability.length === 0) return false;
  const dayOfWeek = now.getDay();
  const todaySlots = availability.filter((slot) => slot.day_of_week === dayOfWeek && slot.is_available);
  if (todaySlots.length === 0) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return todaySlots.some((slot) => {
    const [openH, openM] = slot.start_time.split(':').map(Number);
    const [closeH, closeM] = slot.end_time.split(':').map(Number);
    const openMinutes = (openH ?? 0) * 60 + (openM ?? 0);
    const closeMinutes = (closeH ?? 0) * 60 + (closeM ?? 0);
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  });
}

export function hasActiveDiscoveryFilters({
  search,
  cuisines,
  minRating,
  sortBy,
  openNow,
}: {
  search?: string;
  cuisines?: string[];
  minRating?: number;
  sortBy?: string;
  openNow?: boolean;
}): boolean {
  return Boolean(
    search ||
      (cuisines && cuisines.length > 0) ||
      minRating ||
      openNow ||
      (sortBy && sortBy !== 'default')
  );
}
