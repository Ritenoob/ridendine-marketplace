import { menuItemOptionsTable } from '@ridendine/db';
import type { NextRequest } from 'next/server';
import { updateMenuItemOptionSchema } from '@ridendine/validation';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import { getChefAdminClient, verifyMenuItemOwnedByStorefront, verifyOptionOwnedByMenuItem } from '@/lib/menu-option-guards';

async function authorize(params: { id: string; optionId: string }) {
  const chefContext = await getChefActorContext();
  if (!chefContext) return { ok: false as const, response: errorResponse('UNAUTHORIZED', 'Not authenticated', 401) };

  const adminClient = getChefAdminClient();
  const ownsItem = await verifyMenuItemOwnedByStorefront(adminClient, params.id, chefContext.storefrontId);
  if (!ownsItem) return { ok: false as const, response: errorResponse('NOT_FOUND', 'Menu item not found', 404) };

  const ownsOption = await verifyOptionOwnedByMenuItem(adminClient, params.optionId, params.id);
  if (!ownsOption) return { ok: false as const, response: errorResponse('NOT_FOUND', 'Menu option not found', 404) };

  return { ok: true as const, adminClient };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  const auth = await authorize(params);
  if (!auth.ok) return auth.response;

  const validation = updateMenuItemOptionSchema.omit({ values: true }).safeParse(await request.json());
  if (!validation.success) {
    return errorResponse('VALIDATION_ERROR', validation.error.issues[0]?.message || 'Invalid menu option', 400);
  }

  const patch: Record<string, unknown> = {};
  if (validation.data.name !== undefined) patch.name = validation.data.name;
  if (validation.data.isRequired !== undefined) patch.is_required = validation.data.isRequired;
  if (validation.data.maxSelections !== undefined) patch.max_selections = validation.data.maxSelections;
  if (validation.data.sortOrder !== undefined) patch.sort_order = validation.data.sortOrder;

  const { data, error } = await menuItemOptionsTable((auth.adminClient as any))
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', params.optionId)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to update menu option', 500);
  return successResponse({ option: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  const auth = await authorize(params);
  if (!auth.ok) return auth.response;

  const { error } = await menuItemOptionsTable((auth.adminClient as any))
    .delete()
    .eq('id', params.optionId);

  if (error) return errorResponse('INTERNAL_ERROR', 'Failed to delete menu option', 500);
  return successResponse({ deleted: true });
}
