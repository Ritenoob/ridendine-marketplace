import type { SupabaseClient } from '../client/types';

// ==========================================
// REVIEW REPOSITORY
// ==========================================

/** Exact count of reviews at or below `maxRating` created since `sinceIso`. */
export async function countLowRatingReviewsSince(
  client: SupabaseClient,
  maxRating: number,
  sinceIso: string
): Promise<number> {
  const { count, error } = await client
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .lte('rating', maxRating)
    .gte('created_at', sinceIso);

  if (error) throw error;
  return count ?? 0;
}
