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

async function upsertRows(table, rows, onConflict = 'id') {
  if (rows.length === 0) return [];
  return request(`/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
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

function isoMinutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function restoreMutableLifecycleFixtures() {
  const now = new Date().toISOString();

  await upsertRows('orders', [
    {
      id: '0d000000-0000-4000-8000-000000000001',
      order_number: 'RND-001',
      customer_id: 'c0570000-0000-4000-8000-000000000001',
      storefront_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      delivery_address_id: 'add20000-0000-4000-8000-000000000001',
      status: 'delivered',
      engine_status: 'delivered',
      public_stage: 'delivered',
      payment_status: 'completed',
      payment_intent_id: null,
      subtotal: 40.98,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 5.98,
      tip: 2.00,
      total: 55.96,
      special_instructions: 'Please ring doorbell',
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: null,
      ready_at: null,
      created_at: isoMinutesFromNow(-7200),
      updated_at: now,
    },
    {
      id: '0d000000-0000-4000-8000-000000000004',
      order_number: 'RND-004',
      customer_id: 'c0570000-0000-4000-8000-000000000002',
      storefront_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      delivery_address_id: 'add20000-0000-4000-8000-000000000002',
      status: 'preparing',
      engine_status: 'preparing',
      public_stage: 'preparing',
      payment_status: 'pending',
      payment_intent_id: null,
      subtotal: 39.98,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 5.82,
      tip: 0.00,
      total: 52.80,
      special_instructions: null,
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: isoMinutesFromNow(-20),
      ready_at: null,
      created_at: isoMinutesFromNow(-30),
      updated_at: now,
    },
    {
      id: '0d000000-0000-4000-8000-000000000005',
      order_number: 'RND-005',
      customer_id: 'c0570000-0000-4000-8000-000000000001',
      storefront_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      delivery_address_id: 'add20000-0000-4000-8000-000000000001',
      status: 'pending',
      engine_status: 'pending',
      public_stage: 'placed',
      payment_status: 'pending',
      payment_intent_id: null,
      subtotal: 54.00,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 7.65,
      tip: 0.00,
      total: 68.65,
      special_instructions: 'No spice please',
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: null,
      ready_at: null,
      created_at: isoMinutesFromNow(-2),
      updated_at: now,
    },
    {
      id: '0d000000-0000-4000-8000-000000000006',
      order_number: 'RND-006',
      customer_id: 'c0570000-0000-4000-8000-000000000002',
      storefront_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      delivery_address_id: 'add20000-0000-4000-8000-000000000002',
      status: 'ready_for_pickup',
      engine_status: 'ready',
      public_stage: 'ready_for_pickup',
      payment_status: 'pending',
      payment_intent_id: null,
      subtotal: 41.00,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 5.97,
      tip: 0.00,
      total: 53.97,
      special_instructions: null,
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: isoMinutesFromNow(-35),
      ready_at: isoMinutesFromNow(-15),
      created_at: isoMinutesFromNow(-45),
      updated_at: now,
    },
    {
      id: '0d000000-0000-4000-8000-000000000009',
      order_number: 'RND-009',
      customer_id: 'c0570000-0000-4000-8000-000000000001',
      storefront_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      delivery_address_id: 'add20000-0000-4000-8000-000000000001',
      status: 'ready_for_pickup',
      engine_status: 'ready',
      public_stage: 'ready_for_pickup',
      payment_status: 'pending',
      payment_intent_id: null,
      subtotal: 38.98,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 5.98,
      tip: 2.00,
      total: 53.96,
      special_instructions: 'E2E driver accept fixture',
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: isoMinutesFromNow(-20),
      ready_at: isoMinutesFromNow(-5),
      created_at: isoMinutesFromNow(-25),
      updated_at: now,
    },
    {
      id: '0d000000-0000-4000-8000-000000000007',
      order_number: 'RND-007',
      customer_id: 'c0570000-0000-4000-8000-000000000001',
      storefront_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      delivery_address_id: 'add20000-0000-4000-8000-000000000001',
      status: 'pending',
      engine_status: 'pending',
      public_stage: 'placed',
      payment_status: 'pending',
      payment_intent_id: null,
      subtotal: 38.98,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 5.98,
      tip: 0.00,
      total: 51.96,
      special_instructions: 'E2E cancel fixture - do not prepare',
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: null,
      ready_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: '0d000000-0000-4000-8000-000000000008',
      order_number: 'RND-008',
      customer_id: 'c0570000-0000-4000-8000-000000000002',
      storefront_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      delivery_address_id: 'add20000-0000-4000-8000-000000000002',
      status: 'pending',
      engine_status: 'pending',
      public_stage: 'placed',
      payment_status: 'pending',
      payment_intent_id: null,
      subtotal: 54.00,
      delivery_fee: 5.00,
      service_fee: 2.00,
      tax: 7.93,
      tip: 0.00,
      total: 68.93,
      special_instructions: 'E2E reject fixture - do not prepare',
      cancellation_notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      rejection_notes: null,
      rejection_reason: null,
      prep_started_at: null,
      ready_at: null,
      created_at: now,
      updated_at: now,
    },
  ]);

  await upsertRows('deliveries', [
    {
      id: 'de100000-0000-4000-8000-000000000006',
      order_id: '0d000000-0000-4000-8000-000000000006',
      driver_id: 'd2000000-0000-4000-8000-000000000001',
      status: 'assigned',
      pickup_address: '789 Concession St, Hamilton, ON L8V 1C9',
      dropoff_address: '25 Dundurn St N, Hamilton, ON L8R 3E2',
      distance_km: 2.8,
      delivery_fee: 5.00,
      driver_payout: 7.50,
      assignment_attempts_count: 0,
      actual_pickup_at: null,
      actual_dropoff_at: null,
      pickup_photo_url: null,
      dropoff_photo_url: null,
      pickup_proof_url: null,
      dropoff_proof_url: null,
      customer_signature_url: null,
      last_assignment_at: null,
      updated_at: now,
    },
    {
      id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
      order_id: '0d000000-0000-4000-8000-000000000005',
      driver_id: null,
      status: 'pending',
      pickup_address: '456 Barton St E, Hamilton, ON L8L 2Y5',
      dropoff_address: '10 Main St W, Hamilton, ON L8P 1H1',
      distance_km: 3.5,
      delivery_fee: 5.00,
      driver_payout: 8.00,
      assignment_attempts_count: 1,
      actual_pickup_at: null,
      actual_dropoff_at: null,
      pickup_photo_url: null,
      dropoff_photo_url: null,
      pickup_proof_url: null,
      dropoff_proof_url: null,
      customer_signature_url: null,
      last_assignment_at: now,
      updated_at: now,
    },
    {
      id: 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3',
      order_id: '0d000000-0000-4000-8000-000000000009',
      driver_id: null,
      status: 'pending',
      pickup_address: '123 King St W, Hamilton, ON L8P 1A1',
      dropoff_address: '10 Main St W, Hamilton, ON L8P 1H1',
      distance_km: 3.2,
      delivery_fee: 5.00,
      driver_payout: 8.50,
      assignment_attempts_count: 1,
      actual_pickup_at: null,
      actual_dropoff_at: null,
      pickup_photo_url: null,
      dropoff_photo_url: null,
      pickup_proof_url: null,
      dropoff_proof_url: null,
      customer_signature_url: null,
      last_assignment_at: now,
      updated_at: now,
    },
  ]);

  await upsertRows('assignment_attempts', [
    {
      id: '0ffe0000-0000-4000-8000-000000000002',
      delivery_id: 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3',
      driver_id: 'd2000000-0000-4000-8000-000000000001',
      attempt_number: 1,
      offered_at: now,
      expires_at: isoMinutesFromNow(240),
      response: 'pending',
      responded_at: null,
      decline_reason: null,
      distance_meters: 3200,
      estimated_minutes: 11,
      created_at: now,
    },
    {
      id: '0ffe0000-0000-4000-8000-000000000001',
      delivery_id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
      driver_id: 'd2000000-0000-4000-8000-000000000001',
      attempt_number: 1,
      offered_at: now,
      expires_at: isoMinutesFromNow(240),
      response: 'pending',
      responded_at: null,
      decline_reason: null,
      distance_meters: 3500,
      estimated_minutes: 12,
      created_at: now,
    },
  ]);

  await request('/chef_profiles?id=eq.a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'pending',
      updated_at: now,
    }),
  });

  await request('/chef_profiles?id=eq.cccccccc-cccc-cccc-cccc-cccccccccccc', {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'approved',
      updated_at: now,
    }),
  });

  await request('/chef_storefronts?id=eq.ffffffff-ffff-ffff-ffff-ffffffffffff', {
    method: 'PATCH',
    body: JSON.stringify({
      is_active: true,
      is_paused: false,
      paused_at: null,
      paused_by: null,
      paused_reason: null,
      storefront_state: 'open',
      updated_at: now,
    }),
  });

  await upsertRows('refund_cases', [
    {
      id: 'ca5e0000-0000-4000-8000-000000000001',
      order_id: '0d000000-0000-4000-8000-000000000001',
      requested_by: '44444444-4444-4444-4444-444444444444',
      requested_amount_cents: 1899,
      refund_reason: 'quality_issue',
      refund_notes: 'Burger arrived cold - customer requested a refund for the item.',
      status: 'pending',
      approved_amount_cents: null,
      reviewed_at: null,
      reviewed_by: null,
      processed_at: null,
      stripe_refund_id: null,
      updated_at: now,
    },
  ]);
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
    restoredMutableLifecycleFixtures: false,
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

  await restoreMutableLifecycleFixtures();
  summary.restoredMutableLifecycleFixtures = true;

  console.log(`E2E fixture cleanup complete: ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
