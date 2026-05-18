import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const seedPath = path.join(root, 'supabase', 'seeds', 'seed.sql');

function readEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

for (const fileName of ['.env.local', '.env.test', '.env']) {
  readEnvFile(fileName);
}

if (!fs.existsSync(seedPath)) {
  console.error(`Missing lifecycle seed file: ${seedPath}`);
  process.exit(1);
}

const seedSql = fs.readFileSync(seedPath, 'utf8');

const requiredSeedMarkers = [
  ['ops super-admin account', 'ops@ridendine.ca'],
  ['customer account Alice', 'alice@example.com'],
  ['chef account Sean', 'sean@ridendine.ca'],
  ['chef account Tuan', 'tuan@ridendine.ca'],
  ['driver account Mike', 'mike.driver@ridendine.ca'],
  ['Every Bite Yum storefront slug', 'every-bite-yum'],
  ['Classic Smash Burger item', 'item-eby-01'],
  ['Nashville Hot Chicken item', 'item-eby-03'],
  ['pending approval chef fixture', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'],
  ['preparing order fixture RND-004', 'RND-004'],
  ['pending order fixture RND-005', 'RND-005'],
  ['ready for pickup order fixture RND-006', 'RND-006'],
  ['unassigned pending delivery fixture', 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'],
];

const missingMarkers = requiredSeedMarkers.filter(([, marker]) => !seedSql.includes(marker));

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CRON_SECRET',
  'ENGINE_PROCESSOR_TOKEN',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());

const warnings = [];
if (!process.env.STRIPE_SECRET_KEY?.trim()) {
  warnings.push('STRIPE_SECRET_KEY is not configured; Stripe-gated lifecycle tests will skip.');
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run lifecycle fixture verification with NODE_ENV=production.');
  process.exit(1);
}

if (missingMarkers.length > 0 || missingEnv.length > 0) {
  if (missingMarkers.length > 0) {
    console.error('Lifecycle seed file is missing required deterministic fixtures:');
    for (const [label, marker] of missingMarkers) {
      console.error(`- ${label}: ${marker}`);
    }
  }

  if (missingEnv.length > 0) {
    console.error('Lifecycle environment is missing required variables:');
    for (const key of missingEnv) {
      console.error(`- ${key}`);
    }
  }

  console.error('\nRun `pnpm db:reset` against a non-production Supabase project, then provide the missing .env.test/.env.local values.');
  process.exit(1);
}

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

console.log('Lifecycle fixture preflight passed.');
