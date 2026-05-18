import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset e2e fixtures with NODE_ENV=production.');
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (/supabase\.co$/i.test(new URL(supabaseUrl).hostname) && process.env.E2E_FIXTURE_RESET_ENABLED !== 'true') {
  console.error('Refusing remote Supabase cleanup unless E2E_FIXTURE_RESET_ENABLED=true.');
  process.exit(1);
}

const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
const authUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};
const jsonHeaders = {
  ...headers,
  'Content-Type': 'application/json',
};

async function request(pathname, init = {}) {
  const response = await fetch(`${restUrl}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? jsonHeaders : headers),
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${init.method ?? 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return [];
  return response.json();
}

async function authAdminRequest(pathname, init = {}) {
  const response = await fetch(`${authUrl}${pathname}`, {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${init.method ?? 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function inFilter(values) {
  return `in.(${values.join(',')})`;
}

async function deleteWhere(table, query) {
  return request(`/${table}?${query}`, { method: 'DELETE' });
}

async function resetAuthPassword(userId) {
  await authAdminRequest(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      password: 'password123',
      email_confirm: true,
    }),
  });
}

async function resetAuthPasswordsForProfiles(table, emails) {
  let resetCount = 0;
  for (const email of emails) {
    const profiles = await request(
      `/${table}?email=eq.${encodeURIComponent(email)}&select=user_id`
    );
    for (const profile of profiles) {
      if (!profile.user_id) continue;
      await resetAuthPassword(profile.user_id);
      resetCount += 1;
    }
  }
  return resetCount;
}

async function main() {
  const summary = {
    clearedAliceCarts: 0,
    clearedAliceCartItems: 0,
    removedGeneratedDrivers: 0,
    removedGeneratedDriverAuthUsers: 0,
    removedGeneratedChefs: 0,
    removedGeneratedChefAuthUsers: 0,
    resetMikePresence: 0,
    resetSeededAuthPasswords: 0,
  };

  summary.resetSeededAuthPasswords += await resetAuthPasswordsForProfiles('customers', [
    'alice@example.com',
  ]);
  summary.resetSeededAuthPasswords += await resetAuthPasswordsForProfiles('drivers', [
    'mike.driver@ridendine.ca',
  ]);

  const aliceCustomers = await request('/customers?email=eq.alice%40example.com&select=id');
  const aliceIds = aliceCustomers.map((customer) => customer.id);

  if (aliceIds.length > 0) {
    const carts = await request(`/carts?customer_id=${encodeURIComponent(inFilter(aliceIds))}&select=id`);
    const cartIds = carts.map((cart) => cart.id);

    if (cartIds.length > 0) {
      const deletedItems = await deleteWhere('cart_items', `cart_id=${encodeURIComponent(inFilter(cartIds))}`);
      const deletedCarts = await deleteWhere('carts', `id=${encodeURIComponent(inFilter(cartIds))}`);
      summary.clearedAliceCartItems = deletedItems.length;
      summary.clearedAliceCarts = deletedCarts.length;
    }
  }

  const generatedDrivers = [
    ...(await request('/drivers?email=like.driver-*%40test.local&select=id,user_id')),
    ...(await request('/drivers?email=like.driver-*%40example.com&select=id,user_id')),
    ...(await request('/drivers?email=like.driver-*%40ridendine.ca&select=id,user_id')),
  ];
  const generatedDriverIds = generatedDrivers.map((driver) => driver.id);
  if (generatedDriverIds.length > 0) {
    const deletedDrivers = await deleteWhere('drivers', `id=${encodeURIComponent(inFilter(generatedDriverIds))}`);
    summary.removedGeneratedDrivers = deletedDrivers.length;
  }
  for (const driver of generatedDrivers) {
    if (!driver.user_id) continue;
    await authAdminRequest(`/admin/users/${encodeURIComponent(driver.user_id)}`, { method: 'DELETE' });
    summary.removedGeneratedDriverAuthUsers += 1;
  }

  const generatedChefs = await request('/chef_profiles?display_name=eq.E2E%20Chef&select=id,user_id');
  const generatedChefIds = generatedChefs.map((chef) => chef.id);
  if (generatedChefIds.length > 0) {
    const deletedChefs = await deleteWhere('chef_profiles', `id=${encodeURIComponent(inFilter(generatedChefIds))}`);
    summary.removedGeneratedChefs = deletedChefs.length;
  }
  for (const chef of generatedChefs) {
    if (!chef.user_id) continue;
    await authAdminRequest(`/admin/users/${encodeURIComponent(chef.user_id)}`, { method: 'DELETE' });
    summary.removedGeneratedChefAuthUsers += 1;
  }

  const mikeDrivers = await request('/drivers?email=eq.mike.driver%40ridendine.ca&select=id');
  const mikeIds = mikeDrivers.map((driver) => driver.id);
  if (mikeIds.length > 0) {
    const updatedPresence = await request(`/driver_presence?driver_id=${encodeURIComponent(inFilter(mikeIds))}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'offline', current_shift_id: null }),
    });
    summary.resetMikePresence = updatedPresence.length;
  }

  console.log(`E2E fixture cleanup complete: ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
