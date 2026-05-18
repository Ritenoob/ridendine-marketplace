import type { NextRequest } from 'next/server';
import { createMenuItemOptionSchema } from '@ridendine/validation';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import {
  getChefAdminClient,
  verifyMenuItemOwnedByStorefront,
} from '@/lib/menu-option-guards';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chefContext = await getChefActorContext();
  if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

  const adminClient = getChefAdminClient();
  const ownsItem = await verifyMenuItemOwnedByStorefront(
    adminClient,
    params.id,
    chefContext.storefrontId
  );
  if (!ownsItem) return errorResponse('NOT_FOUND', 'Menu item not found', 404);

  const { data, error } = await (adminClient as any)
    .from('menu_item_options')
    .select('*, menu_item_option_values(*)')
    .eq('menu_item_id', params.id)
    .order('sort_order', { ascending: true });

  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to load menu options', 500);
  return successResponse({ options: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chefContext = await getChefActorContext();
  if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

  const validation = createMenuItemOptionSchema.safeParse(await request.json());
  if (!validation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validation.error.issues[0]?.message || 'Invalid menu option',
      400
    );
  }

  const adminClient = getChefAdminClient();
  const ownsItem = await verifyMenuItemOwnedByStorefront(
    adminClient,
    params.id,
    chefContext.storefrontId
  );
  if (!ownsItem) return errorResponse('NOT_FOUND', 'Menu item not found', 404);

  const { values, ...optionInput } = validation.data;
  const { data: option, error: optionError } = await (adminClient as any)
    .from('menu_item_options')
    .insert({
      menu_item_id: params.id,
      name: optionInput.name,
      is_required: optionInput.isRequired,
      max_selections: optionInput.maxSelections,
      sort_order: optionInput.sortOrder,
    })
    .select()
    .single();

  if (optionError || !option) {
    return errorResponse('INTERNAL_ERROR', 'Failed to create menu option', 500);
  }

  const { data: insertedValues, error: valuesError } = await (adminClient as any)
    .from('menu_item_option_values')
    .insert(
      values.map((value) => ({
        option_id: option.id,
        name: value.name,
        price_adjustment: value.priceAdjustment,
        is_available: value.isAvailable,
        sort_order: value.sortOrder,
      }))
    )
    .select();

  if (valuesError) {
    await (adminClient as any).from('menu_item_options').delete().eq('id', option.id);
    return errorResponse('INTERNAL_ERROR', 'Failed to create menu option values', 500);
  }

  return successResponse({ option: { ...option, values: insertedValues ?? [] } }, 201);
}
