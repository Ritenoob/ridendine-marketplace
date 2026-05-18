import type { NextRequest } from 'next/server';
import { updateMenuItemOptionValueSchema } from '@ridendine/validation';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import {
  getChefAdminClient,
  verifyMenuItemOwnedByStorefront,
  verifyOptionOwnedByMenuItem,
  verifyValueOwnedByOption,
} from '@/lib/menu-option-guards';

async function authorize(params: { id: string; optionId: string; valueId: string }) {
  const chefContext = await getChefActorContext();
  if (!chefContext) return { ok: false as const, response: errorResponse('UNAUTHORIZED', 'Not authenticated', 401) };

  const adminClient = getChefAdminClient();
  const ownsItem = await verifyMenuItemOwnedByStorefront(adminClient, params.id, chefContext.storefrontId);
  if (!ownsItem) return { ok: false as const, response: errorResponse('NOT_FOUND', 'Menu item not found', 404) };

  const ownsOption = await verifyOptionOwnedByMenuItem(adminClient, params.optionId, params.id);
  if (!ownsOption) return { ok: false as const, response: errorResponse('NOT_FOUND', 'Menu option not found', 404) };

  const ownsValue = await verifyValueOwnedByOption(adminClient, params.valueId, params.optionId);
  if (!ownsValue) return { ok: false as const, response: errorResponse('NOT_FOUND', 'Menu option value not found', 404) };

  return { ok: true as const, adminClient };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string; valueId: string } }
) {
  const auth = await authorize(params);
  if (!auth.ok) return auth.response;

  const validation = updateMenuItemOptionValueSchema.safeParse(await request.json());
  if (!validation.success) {
    return errorResponse('VALIDATION_ERROR', validation.error.issues[0]?.message || 'Invalid option value', 400);
  }

  const patch: Record<string, unknown> = {};
  if (validation.data.name !== undefined) patch.name = validation.data.name;
  if (validation.data.priceAdjustment !== undefined) patch.price_adjustment = validation.data.priceAdjustment;
  if (validation.data.isAvailable !== undefined) patch.is_available = validation.data.isAvailable;
  if (validation.data.sortOrder !== undefined) patch.sort_order = validation.data.sortOrder;

  const { data, error } = await (auth.adminClient as any)
    .from('menu_item_option_values')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', params.valueId)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to update option value', 500);
  return successResponse({ value: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; optionId: string; valueId: string } }
) {
  const auth = await authorize(params);
  if (!auth.ok) return auth.response;

  const { error } = await (auth.adminClient as any)
    .from('menu_item_option_values')
    .delete()
    .eq('id', params.valueId);

  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to delete option value', 500);
  return successResponse({ deleted: true });
}
