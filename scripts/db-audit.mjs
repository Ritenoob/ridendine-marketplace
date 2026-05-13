#!/usr/bin/env node
/**
 * scripts/db-audit.mjs — pre/post migration sanity check.
 *
 * Usage:
 *   node scripts/db-audit.mjs            # full audit (read-only)
 *
 * Reads DATABASE_URL from .env or .env.local in the repo root.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

// ---------------------------------------------------------------------------
// Env loading (we don't depend on dotenv to keep this script standalone)
// ---------------------------------------------------------------------------
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

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');
const RELEVANT_TABLES = [
  'audit_logs',
  'orders',
  'ledger_entries',
  'menu_item_availability',
  'menu_item_option_values',
];

function section(title) {
  console.log('\n' + '='.repeat(78));
  console.log(title);
  console.log('='.repeat(78));
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

async function run() {
  await client.connect();

  // 1) Smoke test
  section('1. Connection smoke test');
  const v = await client.query('SELECT version()');
  console.log(v.rows[0].version);

  // 2) Migration drift
  section('2. Migration drift (applied vs. on-disk)');
  const onDisk = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/\.sql$/, ''))
    .sort();
  let applied = [];
  try {
    const r = await client.query(
      "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"
    );
    applied = r.rows.map((row) => row.version);
  } catch (err) {
    console.log('  (supabase_migrations.schema_migrations not found — listing skipped)');
    console.log(`  err: ${err.message}`);
  }
  // Supabase CLI stores the version as the timestamp/number prefix only (e.g. "00001"
  // or "20260501080818"), not the full filename. Map both to that prefix for comparison.
  const prefix = (s) => s.replace(/_.*$/, '');
  const onDiskPrefixes = onDisk.map(prefix);
  const appliedSet = new Set(applied);
  const onDiskSet = new Set(onDiskPrefixes);
  console.log(`  on-disk migrations: ${onDisk.length}`);
  console.log(`  applied (supabase_migrations.schema_migrations): ${applied.length}`);
  const missing = onDiskPrefixes.filter((p) => !appliedSet.has(p));
  const extra = applied.filter((p) => !onDiskSet.has(p));
  if (missing.length) console.log(`  ⚠ ON-DISK BUT NOT APPLIED (${missing.length}): ${missing.join(', ')}`);
  if (extra.length) console.log(`  ⚠ APPLIED BUT NOT ON DISK (${extra.length}): ${extra.join(', ')}`);
  if (!missing.length && !extra.length) console.log('  ✅ in sync');

  // 3) Orphan-audit for the FK adds in 00031
  section('3. Orphan rows that would block FK validation (00031)');
  const orphanCustomers = await client.query(`
    SELECT o.id, o.customer_id, o.created_at
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE c.id IS NULL
    ORDER BY o.created_at DESC
    LIMIT 20
  `);
  const orphanStorefronts = await client.query(`
    SELECT o.id, o.storefront_id, o.created_at
    FROM orders o
    LEFT JOIN chef_storefronts s ON s.id = o.storefront_id
    WHERE s.id IS NULL
    ORDER BY o.created_at DESC
    LIMIT 20
  `);
  console.log(`  orphan orders (no matching customer):   ${orphanCustomers.rowCount}`);
  console.log(`  orphan orders (no matching storefront): ${orphanStorefronts.rowCount}`);
  if (orphanCustomers.rowCount > 0) {
    console.log('  --- first 20 customer orphans ---');
    for (const row of orphanCustomers.rows) console.log(`    ${row.id} customer=${row.customer_id} created=${row.created_at}`);
  }
  if (orphanStorefronts.rowCount > 0) {
    console.log('  --- first 20 storefront orphans ---');
    for (const row of orphanStorefronts.rows) console.log(`    ${row.id} storefront=${row.storefront_id} created=${row.created_at}`);
  }

  // 4) Foreign-key snapshot on orders + ledger_entries
  section('4. Foreign keys on orders & ledger_entries');
  const fks = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      tc.constraint_name,
      ccu.table_name AS references_table,
      ccu.column_name AS references_column,
      rc.delete_rule,
      pg_constraint.convalidated AS is_valid
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    JOIN pg_constraint
      ON pg_constraint.conname = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('orders', 'ledger_entries')
    ORDER BY tc.table_name, kcu.column_name
  `);
  for (const row of fks.rows) {
    console.log(
      `  ${row.table_name}.${row.column_name} -> ${row.references_table}.${row.references_column}  ON DELETE ${row.delete_rule}  valid=${row.is_valid}  [${row.constraint_name}]`
    );
  }
  if (fks.rowCount === 0) console.log('  (none)');

  // 5) RLS policy snapshot on the tables we care about
  section('5. RLS policies on critical tables');
  const policies = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
    ORDER BY tablename, policyname
  `, [RELEVANT_TABLES]);
  let currentTable = '';
  for (const row of policies.rows) {
    if (row.tablename !== currentTable) {
      currentTable = row.tablename;
      console.log(`  -- ${row.tablename} --`);
    }
    console.log(`    "${row.policyname}" cmd=${row.cmd} roles=${JSON.stringify(row.roles)}`);
  }
  if (policies.rowCount === 0) console.log('  (no policies on these tables)');
  // Tables with RLS enabled but zero policies = effectively locked-down
  const rlsOn = await client.query(`
    SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1)
  `, [RELEVANT_TABLES]);
  console.log('  -- RLS enabled flag --');
  for (const row of rlsOn.rows) {
    console.log(`    ${row.tablename}: rls_enabled=${row.rls_enabled}`);
  }

  // 6) Triggers on orders
  section('6. Triggers on orders');
  const trg = await client.query(`
    SELECT trigger_name, event_manipulation, action_timing, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table = 'orders'
    ORDER BY trigger_name
  `);
  for (const row of trg.rows) {
    console.log(`  ${row.action_timing} ${row.event_manipulation} ${row.trigger_name}`);
  }

  // 7) Quick row counts for sanity
  section('7. Sample row counts');
  const counts = await client.query(`
    SELECT 'orders' AS t, count(*)::text AS n FROM orders
    UNION ALL SELECT 'customers', count(*)::text FROM customers
    UNION ALL SELECT 'chef_storefronts', count(*)::text FROM chef_storefronts
    UNION ALL SELECT 'menu_items', count(*)::text FROM menu_items
    UNION ALL SELECT 'drivers', count(*)::text FROM drivers
    UNION ALL SELECT 'deliveries', count(*)::text FROM deliveries
    UNION ALL SELECT 'ledger_entries', count(*)::text FROM ledger_entries
    UNION ALL SELECT 'audit_logs', count(*)::text FROM audit_logs
  `);
  for (const row of counts.rows) {
    console.log(`  ${row.t}: ${row.n}`);
  }

  console.log('\nAudit complete.\n');
}

run()
  .catch((err) => {
    console.error('AUDIT FAILED:', err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
