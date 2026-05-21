#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const strictEnv = args.has('--strict-env');

const results = [];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function addCheck(name, passed, detail) {
  results.push({ name, passed, detail });
}

function requiredEnvCheck(group, keys) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  addCheck(
    `env:${group}`,
    missing.length === 0 || !strictEnv,
    missing.length === 0
      ? 'configured'
      : `missing ${missing.join(', ')}${strictEnv ? '' : ' (run with --strict-env to fail)'}`
  );
}

const migrationDir = path.join(root, 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql'));
const prefixes = new Map();
for (const file of migrationFiles) {
  const prefix = file.match(/^(\d+)_/)?.[1];
  if (!prefix) continue;
  const existing = prefixes.get(prefix) || [];
  existing.push(file);
  prefixes.set(prefix, existing);
}
const duplicatePrefixes = [...prefixes.entries()]
  .filter(([, files]) => files.length > 1)
  .map(([prefix, files]) => `${prefix}: ${files.join(', ')}`);
addCheck(
  'migrations:unique numeric prefixes',
  duplicatePrefixes.length === 0,
  duplicatePrefixes.length === 0 ? 'ok' : duplicatePrefixes.join('; ')
);

const paymentMigrationPath = 'supabase/migrations/00040_payment_status_partial_refunds_and_order_fk_validation.sql';
const paymentMigrationExists = fs.existsSync(path.join(root, paymentMigrationPath));
addCheck('migrations:partial refund/FK validation migration exists', paymentMigrationExists, paymentMigrationPath);
if (paymentMigrationExists) {
  const migration = readProjectFile(paymentMigrationPath);
  addCheck(
    'migrations:partial refund status allowed',
    migration.includes("'partially_refunded'"),
    'orders.payment_status check includes partially_refunded'
  );
  addCheck(
    'migrations:order FK orphan guard',
    migration.includes('RAISE EXCEPTION') &&
      migration.includes('orders_customer_id_fkey') &&
      migration.includes('orders_storefront_id_fkey'),
    'migration blocks orphaned orders before validation'
  );
  addCheck(
    'migrations:order FKs validated',
    migration.includes('VALIDATE CONSTRAINT orders_customer_id_fkey') &&
      migration.includes('VALIDATE CONSTRAINT orders_storefront_id_fkey'),
    'customer/storefront FKs are validated'
  );
}

const checkoutRoute = readProjectFile('apps/web/src/app/api/checkout/route.ts');
addCheck(
  'payments:checkout declares automatic capture',
  checkoutRoute.includes("capture_method: 'automatic'"),
  'PaymentIntent capture_method is explicit'
);

const transitions = readProjectFile('packages/types/src/engine/transitions.ts');
const pickupTransition = transitions.match(/action: 'confirm_pickup'[\s\S]*?auditRequired: true,/);
addCheck(
  'payments:pickup transition does not claim provider capture',
  Boolean(pickupTransition) &&
    !pickupTransition[0].includes('capture_payment') &&
    !pickupTransition[0].includes('ORDER_PAYMENT_CAPTURED'),
  'confirm_pickup is delivery-only'
);

const dispatch = readProjectFile('packages/engine/src/orchestrators/dispatch-orchestrator.ts');
addCheck(
  'dispatch:driver payout uses shared calculator',
  dispatch.includes('calculateDriverPayoutAmount(order.delivery_fee)'),
  'dispatch payout is based on actual order delivery_fee'
);

const driverUpload = readProjectFile('apps/driver-app/src/app/api/upload/route.ts');
addCheck(
  'storage:delivery proof bucket is private',
  driverUpload.includes("public: false") && !driverUpload.includes('getPublicUrl'),
  'delivery proof route returns signed URLs instead of public URLs'
);

const slaCron = readProjectFile('apps/ops-admin/src/app/api/cron/sla-tick/route.ts');
addCheck(
  'cron:legacy SLA route retired',
  slaCron.includes('DEPRECATED_CRON_ROUTE') && slaCron.includes("'/api/engine/processors/sla'"),
  'legacy cron route returns 410 with canonical replacement'
);

requiredEnvCheck('supabase', [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]);
requiredEnvCheck('stripe', [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
]);
requiredEnvCheck('processors', [
  'CRON_SECRET',
  'ENGINE_PROCESSOR_TOKEN',
]);
requiredEnvCheck('distributed-rate-limit', [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
]);
requiredEnvCheck('observability', [
  'NEXT_PUBLIC_SENTRY_DSN',
]);

let failures = 0;
for (const result of results) {
  const marker = result.passed ? 'PASS' : 'FAIL';
  console.log(`${marker} ${result.name}: ${result.detail}`);
  if (!result.passed) failures += 1;
}

if (failures > 0) {
  console.error(`Production-readiness verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Production-readiness verification passed.');
