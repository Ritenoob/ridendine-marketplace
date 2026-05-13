#!/usr/bin/env node
/**
 * scripts/db-counts.mjs — quick row counts via Supabase REST API (HTTPS).
 * Used to take a before/after fingerprint around a migration push.
 *
 * Uses fetch + service-role key; works around the IPv6-only direct DB issue.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(resolve(process.cwd(), '.env'));
loadEnv(resolve(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TABLES = [
  'orders', 'order_items', 'customers', 'customer_addresses',
  'chef_profiles', 'chef_storefronts', 'chef_kitchens',
  'menu_items', 'menu_categories', 'menu_item_options', 'menu_item_option_values', 'menu_item_availability',
  'drivers', 'driver_presence', 'deliveries', 'delivery_assignments',
  'ledger_entries', 'audit_logs', 'platform_users', 'platform_settings',
  'reviews', 'support_tickets', 'notifications', 'carts', 'cart_items',
  'promo_codes', 'favorites',
];

async function countTable(t) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/${t}?select=*&limit=1`,
    {
      method: 'HEAD',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: 'count=exact',
      },
    }
  );
  if (!r.ok) {
    return { table: t, error: `${r.status} ${r.statusText}` };
  }
  // Content-Range header has the count: "0-0/123"
  const cr = r.headers.get('content-range') || '';
  const count = cr.split('/')[1] ?? '?';
  return { table: t, count };
}

const results = await Promise.all(TABLES.map(countTable));
const colWidth = Math.max(...TABLES.map((t) => t.length)) + 2;
for (const r of results) {
  const t = r.table.padEnd(colWidth);
  if (r.error) console.log(`${t} ${r.error}`);
  else console.log(`${t} ${r.count}`);
}
