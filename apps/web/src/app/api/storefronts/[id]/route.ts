import { chefStorefrontsTable, createAdminClient, getStorefrontBySlug } from '@ridendine/db';
import { successResponse, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function publicStorefront(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    cuisineTypes: row.cuisine_types ?? [],
    coverImageUrl: row.cover_image_url,
    logoUrl: row.logo_url,
    averageRating: row.average_rating,
    totalReviews: row.total_reviews,
    minOrderAmount: row.min_order_amount,
    estimatedPrepTimeMin: row.estimated_prep_time_min,
    estimatedPrepTimeMax: row.estimated_prep_time_max,
    // No `accepting_orders` column — active and not paused means taking orders.
    acceptingOrders: row.is_active === true && row.is_paused !== true,
    isPaused: row.is_paused === true,
    chef: row.chef_profiles
      ? {
          id: row.chef_profiles.id,
          displayName: row.chef_profiles.display_name,
          profileImageUrl: row.chef_profiles.profile_image_url,
        }
      : null,
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = createAdminClient() as any;
    const storefront =
      (await getStorefrontBySlug(client, id)) ??
      (
        await chefStorefrontsTable(client)
          .select(`
            *,
            chef_profiles!inner (
              id,
              display_name,
              profile_image_url,
              status
            )
          `)
          .eq('id', id)
          .eq('is_active', true)
          .eq('chef_profiles.status', 'approved')
          .maybeSingle()
      ).data;
    if (!storefront) return errorResponse('NOT_FOUND', 'Storefront not found', 404);
    return successResponse({ storefront: publicStorefront(storefront) });
  } catch (error) {
    console.error('Error fetching storefront:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
