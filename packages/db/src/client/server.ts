import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { Database } from '../database.merged';
import type { SupabaseClient } from './types';

type CookieStore = {
  get: (name: string) => { value: string } | undefined;
  getAll?: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options?: object) => void;
  delete: (name: string) => void;
};

type CookieToSet = {
  name: string;
  value: string;
  options?: object;
};

/**
 * Create a Supabase client for server-side usage (API routes, server components).
 * Requires cookies to be passed for session management.
 * This client respects RLS policies.
 */
export function createServerClient(cookieStore: CookieStore): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const client = createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof cookieStore.getAll === 'function') {
          return cookieStore.getAll();
        }
        return [];
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Handle server component context where cookies can't be set
          }
        }
      },
    },
  });

  // @supabase/ssr@0.5.x still declares its return type with supabase-js's old
  // three-slot generic signature (Database, SchemaName, Schema), while
  // supabase-js >= 2.49 moved to (Database, SchemaNameOrClientOptions, ...).
  // The runtime object is a plain supabase-js client, so this cast only
  // realigns the generic parameters — it does not loosen row typing.
  return client as unknown as SupabaseClient;
}
