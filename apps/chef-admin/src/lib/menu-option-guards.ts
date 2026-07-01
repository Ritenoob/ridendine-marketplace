import { menuItemsTable, menuItemOptionsTable, menuItemOptionValuesTable, createAdminClient, type SupabaseClient } from '@ridendine/db';

export function getChefAdminClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

export async function verifyMenuItemOwnedByStorefront(
  adminClient: SupabaseClient,
  menuItemId: string,
  storefrontId: string
): Promise<boolean> {
  const { data } = await menuItemsTable(adminClient)
    .select('id')
    .eq('id', menuItemId)
    .eq('storefront_id', storefrontId)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function verifyOptionOwnedByMenuItem(
  adminClient: SupabaseClient,
  optionId: string,
  menuItemId: string
): Promise<boolean> {
  const { data } = await menuItemOptionsTable(adminClient)
    .select('id')
    .eq('id', optionId)
    .eq('menu_item_id', menuItemId)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function verifyValueOwnedByOption(
  adminClient: SupabaseClient,
  valueId: string,
  optionId: string
): Promise<boolean> {
  const { data } = await menuItemOptionValuesTable(adminClient)
    .select('id')
    .eq('id', valueId)
    .eq('option_id', optionId)
    .maybeSingle();

  return Boolean(data?.id);
}
