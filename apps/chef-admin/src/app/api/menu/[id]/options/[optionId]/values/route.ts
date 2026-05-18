import type { NextRequest } from 'next/server';
import { createMenuItemOptionValueSchema } from '@ridendine/validation';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import {
  getChefAdminClient,
  verifyMenuItemOwnedByStorefront,
  verifyOptionOwnedByMenuItem,
} from '@/lib/menu-option-guards';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  const chefContext = await getChefActorContext();
  if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

  const validation = createMenuItemOptionValueSchema.safeParse(await request.json());
  if (!validation.success) {
    return errorResponse('VALIDATION_ERROR', validation.error.issues[0]?.message || 'Invalid option value', 400);
  }

  const adminClient = getChefAdminClient();
  const ownsItem = await verifyMenuItemOwnedByStorefront(adminClient, params.id, chefContext.storefrontId);
  if (!ownsItem) return errorResponse('NOT_FOUND', 'Menu item not found', 404);

  const ownsOption = await verifyOptionOwnedByMenuItem(adminClient, params.optionId, params.id);
  if (!ownsOption) return errorResponse('NOT_FOUND', 'Menu option not found', 404);

  const { data, error } = await (adminClient as any)
    .from('menu_item_option_values')
    .insert({
      option_id: params.optionId,
      name: validation.data.name,
      price_adjustment: validation.data.priceAdjustment,
      is_available: validation.data.isAvailable,
      sort_order: validation.data.sortOrder,
    })
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to create option value', 500);
  return successResponse({ value: data }, 201);
}
