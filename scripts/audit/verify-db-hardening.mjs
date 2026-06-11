#!/usr/bin/env node
/**
 * scripts/audit/verify-db-hardening.mjs — verify the security/integrity
 * hardening from migrations 00045/00046 actually landed in the target
 * database (read-only).
 *
 * Checks:
 *   1. deliveries(order_id) has the uq_deliveries_order_id unique index.
 *      00045 skips creating it (with a NOTICE) when duplicate rows already
 *      exist, so an applied migration does NOT guarantee the index.
 *   2. No duplicate deliveries.order_id rows exist.
 *   3. No SECURITY DEFINER function in schema public is executable by
 *      anon or PUBLIC (the 00046 residual-grant audit, continuously).
 *
 * Usage:
 *   node scripts/audit/verify-db-hardening.mjs
 *
 * Reads DATABASE_URL from .env or .env.local in the repo root (same
 * conventions as scripts/db-audit.mjs). Exits 1 on any failed check.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

function loadEnv(path) {
  if (!existsSync(path)) return;
  const txt = readFileSync(path, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(resolve(process.cwd(), '.env'));
loadEnv(resolve(process.cwd(), '.env.local'));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('FATAL: DATABASE_URL not found in .env or .env.local');
  process.exit(1);
}

// pg's URL parser is strict and chokes on un-encoded special chars in passwords.
// Parse manually with a tolerant regex and pass discrete params.
const m = url.match(
  /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/
);
if (!m) {
  console.error('FATAL: DATABASE_URL not in expected postgres:// format');
  process.exit(1);
}
const [, dbUser, dbPassword, dbHost, dbPort, dbName] = m;
const client = new Client({
  user: dbUser,
  password: dbPassword,
  host: dbHost,
  port: dbPort ? parseInt(dbPort, 10) : 5432,
  database: dbName,
  ssl: { rejectUnauthorized: false }, // Supabase Postgres requires SSL
});

// DEFINER functions where anon/PUBLIC EXECUTE is intentional (see migration
// 00046's disposition notes): RLS helper functions are referenced inside
// row-security policy expressions, which evaluate as the querying role —
// revoking anon would break public browse queries on policied tables.
// PostGIS extension functions (st_*) carry PUBLIC EXECUTE by design.
const DEFINER_GRANT_ALLOWLIST = new Set([
  'is_ops_admin',
  'get_chef_id',
  'get_customer_id',
  'get_driver_id',
  'is_platform_staff',
  'is_finance_staff',
  'is_support_staff',
]);

function isAllowlistedDefiner(name) {
  return DEFINER_GRANT_ALLOWLIST.has(name) || name.startsWith('st_');
}

let failures = 0;

function pass(msg) {
  console.log(`  PASS  ${msg}`);
}

function fail(msg) {
  failures += 1;
  console.error(`  FAIL  ${msg}`);
}

async function run() {
  await client.connect();

  console.log('1. uq_deliveries_order_id unique index');
  const idx = await client.query(
    `SELECT indexdef FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'deliveries'
       AND indexname = 'uq_deliveries_order_id'`
  );
  if (idx.rows.length === 1 && /UNIQUE/i.test(idx.rows[0].indexdef)) {
    pass('unique index exists');
  } else {
    fail(
      'uq_deliveries_order_id missing — 00045 skipped it (duplicates existed at migration time). ' +
        'Dedupe, then run: CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_order_id ON deliveries(order_id);'
    );
  }

  console.log('2. duplicate deliveries.order_id rows');
  const dupes = await client.query(
    `SELECT order_id, array_agg(id ORDER BY created_at) AS delivery_ids, COUNT(*) AS n
     FROM deliveries
     GROUP BY order_id
     HAVING COUNT(*) > 1`
  );
  if (dupes.rows.length === 0) {
    pass('no duplicate deliveries per order');
  } else {
    fail(`${dupes.rows.length} order(s) with multiple deliveries:`);
    for (const row of dupes.rows) {
      console.error(`        order ${row.order_id}: ${row.delivery_ids.join(', ')}`);
    }
  }

  console.log('3. SECURITY DEFINER functions executable by anon/PUBLIC');
  // aclexplode expands the function ACL; an empty ACL (NULL proacl) means
  // owner-only, which is safe. Trigger functions are included deliberately —
  // they cannot be called via RPC, but a grant on them is still drift.
  const definer = await client.query(
    `SELECT p.proname,
            pg_get_function_identity_arguments(p.oid) AS args,
            grantee.rolname AS grantee
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, ARRAY[]::aclitem[])) AS acl
     LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND acl.privilege_type = 'EXECUTE'
       AND (acl.grantee = 0 OR grantee.rolname = 'anon')
     ORDER BY p.proname`
  );
  const residual = definer.rows.filter((row) => !isAllowlistedDefiner(row.proname));
  const allowlisted = definer.rows.length - residual.length;
  if (residual.length === 0) {
    pass(`no DEFINER function grants to anon/PUBLIC (${allowlisted} allowlisted)`);
  } else {
    fail(`${residual.length} residual DEFINER grant(s) (${allowlisted} allowlisted):`);
    for (const row of residual) {
      const who = row.grantee ?? 'PUBLIC';
      console.error(`        ${row.proname}(${row.args}) -> ${who}`);
    }
    console.error(
      '        Revoke with: REVOKE EXECUTE ON FUNCTION <name>(<args>) FROM PUBLIC, anon;'
    );
  }

  await client.end();

  console.log('');
  if (failures > 0) {
    console.error(`verify-db-hardening: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log('verify-db-hardening: all checks passed');
}

run().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
