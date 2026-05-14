#!/usr/bin/env node
/**
 * Seed one demo order from Alice → Every Bite Yum, frozen at engine_status='picked_up'
 * (= public_stage 'on_the_way'). Lets us verify the customer status-watching loop:
 *   /account/orders → click the order → /orders/<id>/confirmation → live tracker.
 *
 * Idempotent: skips if RD-DEMO-001 already exists.
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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env'); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// Known IDs from earlier probes
const ALICE_CUSTOMER_ID = '7b0c7cfc-673f-41ec-a0df-4b001756a08c';
const STOREFRONT_ID = 'a1a1a1a1-0001-0001-0021-a1a1a1a1a1a1'; // Every Bite Yum
const MENU_ITEM_ID = 'a1a1a1a1-0001-0001-0041-a1a1a1a1a1a1'; // Classic Smash Burger
const MIKE_DRIVER_ID = 'd9b02102-2ce5-4d9d-85e1-dc8d530ecf82';
const KITCHEN_ID = 'a1a1a1a1-0001-0001-0011-a1a1a1a1a1a1';
const KITCHEN_LAT = 43.2557, KITCHEN_LNG = -79.8711;
const ALICE_ADDRESS_ID = '224d74dc-2808-4c74-8135-71eff72b0b57';
const ALICE_LAT = 43.2557, ALICE_LNG = -79.8711;

const ORDER_NUMBER = 'RD-DEMO-001';

async function get(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// --- idempotency ---
const existing = await get(`orders?select=id,order_number,engine_status&order_number=eq.${ORDER_NUMBER}`);
if (existing.length > 0) {
  console.log(`Order ${ORDER_NUMBER} already exists (id=${existing[0].id}, engine_status=${existing[0].engine_status}). Skipping seed.`);
  process.exit(0);
}

// --- money ---
const subtotal = 18.99;
const deliveryFee = 5.00;
const serviceFee = +(subtotal * 0.08).toFixed(2);
const tax = +((subtotal + deliveryFee + serviceFee) * 0.13).toFixed(2);
const tip = 3.00;
const total = +(subtotal + deliveryFee + serviceFee + tax + tip).toFixed(2);

console.log(`Seeding ${ORDER_NUMBER}: subtotal=${subtotal} deliveryFee=${deliveryFee} serviceFee=${serviceFee} tax=${tax} tip=${tip} total=${total}`);

// --- order ---
const [order] = await post('orders', {
  order_number: ORDER_NUMBER,
  customer_id: ALICE_CUSTOMER_ID,
  storefront_id: STOREFRONT_ID,
  delivery_address_id: ALICE_ADDRESS_ID,
  status: 'picked_up',
  engine_status: 'picked_up',
  payment_status: 'completed',
  subtotal,
  delivery_fee: deliveryFee,
  service_fee: serviceFee,
  tax,
  tip,
  total,
  special_instructions: 'Extra crispy fries please',
  estimated_prep_minutes: 18,
  estimated_ready_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  actual_ready_at: new Date(Date.now() - 4 * 60_000).toISOString(),
});
console.log('  order ✓', order.id);

// --- order item ---
const [item] = await post('order_items', {
  order_id: order.id,
  menu_item_id: MENU_ITEM_ID,
  menu_item_name: 'Classic Smash Burger',
  quantity: 1,
  unit_price: subtotal,
  total_price: subtotal,
});
console.log('  order_item ✓', item.id);

// --- delivery ---
const pickedUpAt = new Date(Date.now() - 2 * 60_000).toISOString();
const etaDropoff = new Date(Date.now() + 6 * 60_000).toISOString();
const [delivery] = await post('deliveries', {
  order_id: order.id,
  driver_id: MIKE_DRIVER_ID,
  status: 'picked_up',
  pickup_address: '123 King St W, Unit 4, Hamilton, ON L8P 1A1',
  pickup_lat: KITCHEN_LAT,
  pickup_lng: KITCHEN_LNG,
  dropoff_address: '100 King St W, Hamilton, ON L8P 1A2',
  dropoff_lat: ALICE_LAT,
  dropoff_lng: ALICE_LNG,
  distance_km: 0.4,
  delivery_fee: deliveryFee,
  driver_payout: +(deliveryFee * 0.80).toFixed(2),
  assignment_attempts_count: 1,
  escalated_to_ops: false,
  actual_pickup_at: pickedUpAt,
  estimated_dropoff_at: etaDropoff,
  eta_dropoff_at: etaDropoff,
});
console.log('  delivery ✓', delivery.id);

console.log(`\n✅ Seeded order ${ORDER_NUMBER} at engine_status='picked_up' (public_stage='on_the_way').`);
console.log(`   Customer URL: https://ridendine.ca/orders/${order.id}/confirmation`);
console.log(`   Or visit https://ridendine.ca/account/orders (after logging in as alice@example.com).`);
