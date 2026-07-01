import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const seedPath = path.join(root, 'supabase', 'seeds', 'seed.sql');
const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to apply local seed with NODE_ENV=production.');
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(connectionString);
} catch {
  console.error('SUPABASE_DB_URL/DATABASE_URL must be a valid Postgres connection URL.');
  process.exit(1);
}

const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
if (!localHosts.has(parsedUrl.hostname) && process.env.E2E_REMOTE_SEED_ENABLED !== 'true') {
  console.error('Refusing to apply seed to a non-local database without E2E_REMOTE_SEED_ENABLED=true.');
  process.exit(1);
}

if (!fs.existsSync(seedPath)) {
  console.error(`Missing seed file: ${seedPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(seedPath, 'utf8');
const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied local seed: ${path.relative(root, seedPath)}`);
} finally {
  await client.end();
}
