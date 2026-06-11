/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient as SupabaseJsClient } from '@supabase/supabase-js';
import type { Database } from '../database.merged';

/** Fully typed supabase-js client over the merged Database schema. */
type TypedSupabaseClient = SupabaseJsClient<Database>;

/**
 * The canonical Supabase client type for this codebase.
 *
 * Both @supabase/supabase-js (`createClient`) and @supabase/ssr
 * (`createServerClient` / `createBrowserClient`) clients satisfy this type,
 * so repositories and consumers get fully typed `from()` / `rpc()` calls
 * against the merged Database schema.
 *
 * DELIBERATE LOOSENESS: `from('driver_presence')` returns an untyped builder.
 * packages/engine/src/services/dispatch.service.ts indexes the result rows in
 * a way that is incompatible with `noUncheckedIndexedAccess` under the typed
 * builder, and that package cannot be modified from here. Every other table
 * is fully typed. Remove the loose overload once dispatch.service handles the
 * possibly-undefined element itself.
 */
export type SupabaseClient = Omit<TypedSupabaseClient, 'from'> & {
  from(relation: 'driver_presence'): any;
} & {
  from: TypedSupabaseClient['from'];
};
