do $$
declare
  password_hash text := '$2a$10$ObJ75HoyibHEnRpfZ7Qx6OWaGu0ssN9XELgVSJBJeexhw2q1nNW5i';
  instance uuid := '00000000-0000-0000-0000-000000000000';
  admin_user uuid;
begin
  select id into admin_user from auth.users where email = 'ops@ridendine.ca' limit 1;

  if admin_user is null then
    raise exception 'Missing local super admin ops@ridendine.ca. Run the super admin seed first.';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    email_change_confirm_status,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  )
  values
    (instance, '10000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'test.dummy.chef1@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Chef 1","app_role":"chef"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'test.dummy.chef2@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Chef 2","app_role":"chef"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'test.dummy.chef3@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Chef 3","app_role":"chef"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'test.dummy.driver1@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Driver 1","app_role":"driver"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', 'test.dummy.driver2@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Driver 2","app_role":"driver"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000203', 'authenticated', 'authenticated', 'test.dummy.driver3@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Driver 3","app_role":"driver"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000301', 'authenticated', 'authenticated', 'test.dummy.customer1@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Customer 1","app_role":"customer"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000302', 'authenticated', 'authenticated', 'test.dummy.customer2@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Customer 2","app_role":"customer"}', false, false, false, now(), now()),
    (instance, '10000000-0000-0000-0000-000000000303', 'authenticated', 'authenticated', 'test.dummy.customer3@ridendine.local', password_hash, now(), '', '', '', '', '', '', '', 0, '', '{"provider":"email","providers":["email"]}', '{"full_name":"Test Dummy Customer 3","app_role":"customer"}', false, false, false, now(), now())
  on conflict (id) do update
    set encrypted_password = excluded.encrypted_password,
        email_confirmed_at = excluded.email_confirmed_at,
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now();

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
  select
    u.id::text,
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now(),
    u.id
  from auth.users u
  where u.email like 'test.dummy.%@ridendine.local'
  on conflict (provider, provider_id) do update
    set identity_data = excluded.identity_data,
        updated_at = now();

  insert into public.chef_profiles (id, user_id, display_name, bio, phone, status, created_at, updated_at)
  values
    ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000101', 'Test Dummy Chef 1', 'Local seeded chef for admin engine testing.', '+14165550101', 'approved', now(), now()),
    ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000102', 'Test Dummy Chef 2', 'Local seeded chef for admin engine testing.', '+14165550102', 'approved', now(), now()),
    ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000103', 'Test Dummy Chef 3', 'Local seeded chef for admin engine testing.', '+14165550103', 'approved', now(), now())
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        bio = excluded.bio,
        phone = excluded.phone,
        status = excluded.status,
        updated_at = now();

  insert into public.chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, country, lat, lng, is_verified, phone, address, created_at, updated_at)
  values
    ('21000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 'Test Dummy Kitchen 1', '101 King Street West', 'Toronto', 'ON', 'M5H 1A1', 'CA', 43.6487, -79.3817, true, '+14165550101', '101 King Street West, Toronto, ON', now(), now()),
    ('21000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', 'Test Dummy Kitchen 2', '102 King Street West', 'Toronto', 'ON', 'M5H 1A2', 'CA', 43.6492, -79.3830, true, '+14165550102', '102 King Street West, Toronto, ON', now(), now()),
    ('21000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103', 'Test Dummy Kitchen 3', '103 King Street West', 'Toronto', 'ON', 'M5H 1A3', 'CA', 43.6501, -79.3841, true, '+14165550103', '103 King Street West, Toronto, ON', now(), now())
  on conflict (id) do update
    set name = excluded.name,
        is_verified = excluded.is_verified,
        updated_at = now();

  insert into public.chef_storefronts (id, chef_id, kitchen_id, slug, name, description, cuisine_types, is_active, is_featured, average_rating, total_reviews, min_order_amount, estimated_prep_time_min, estimated_prep_time_max, address, storefront_state, current_queue_size, max_queue_size, average_prep_minutes, phone, created_at, updated_at)
  values
    ('22000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', '21000000-0000-0000-0000-000000000101', 'test-dummy-chef-1', 'Test Dummy Chef 1', 'Seeded storefront for admin engine testing.', array['Comfort','Local'], true, true, 4.80, 18, 1500, 15, 30, '101 King Street West, Toronto, ON', 'published', 1, 10, 22, '+14165550101', now(), now()),
    ('22000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', '21000000-0000-0000-0000-000000000102', 'test-dummy-chef-2', 'Test Dummy Chef 2', 'Seeded storefront for admin engine testing.', array['Healthy','Bowls'], true, false, 4.70, 12, 1200, 18, 35, '102 King Street West, Toronto, ON', 'published', 2, 10, 25, '+14165550102', now(), now()),
    ('22000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103', '21000000-0000-0000-0000-000000000103', 'test-dummy-chef-3', 'Test Dummy Chef 3', 'Seeded storefront for admin engine testing.', array['Dinner','Family'], true, false, 4.90, 24, 1800, 20, 40, '103 King Street West, Toronto, ON', 'published', 0, 10, 20, '+14165550103', now(), now())
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        is_active = excluded.is_active,
        storefront_state = excluded.storefront_state,
        current_queue_size = excluded.current_queue_size,
        updated_at = now();

  insert into public.menu_categories (id, storefront_id, name, description, sort_order, is_active, created_at, updated_at)
  values
    ('23000000-0000-0000-0000-000000000101', '22000000-0000-0000-0000-000000000101', 'Test Dummy Meals', 'Seeded local testing meals.', 1, true, now(), now()),
    ('23000000-0000-0000-0000-000000000102', '22000000-0000-0000-0000-000000000102', 'Test Dummy Meals', 'Seeded local testing meals.', 1, true, now(), now()),
    ('23000000-0000-0000-0000-000000000103', '22000000-0000-0000-0000-000000000103', 'Test Dummy Meals', 'Seeded local testing meals.', 1, true, now(), now())
  on conflict (id) do update
    set is_active = excluded.is_active,
        updated_at = now();

  insert into public.menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, prep_time_minutes, sort_order, created_at, updated_at)
  values
    ('24000000-0000-0000-0000-000000000101', '23000000-0000-0000-0000-000000000101', '22000000-0000-0000-0000-000000000101', 'Test Dummy Bowl 1', 'Seeded local testing item.', 18.50, true, true, 20, 1, now(), now()),
    ('24000000-0000-0000-0000-000000000102', '23000000-0000-0000-0000-000000000102', '22000000-0000-0000-0000-000000000102', 'Test Dummy Bowl 2', 'Seeded local testing item.', 21.00, true, true, 24, 1, now(), now()),
    ('24000000-0000-0000-0000-000000000103', '23000000-0000-0000-0000-000000000103', '22000000-0000-0000-0000-000000000103', 'Test Dummy Bowl 3', 'Seeded local testing item.', 24.75, true, true, 18, 1, now(), now())
  on conflict (id) do update
    set price = excluded.price,
        is_available = excluded.is_available,
        updated_at = now();

  insert into public.drivers (id, user_id, first_name, last_name, phone, email, status, rating, total_deliveries, vehicle_type, vehicle_description, instant_payouts_enabled, created_at, updated_at)
  values
    ('30000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000201', 'Test Dummy', 'Driver 1', '+14165550201', 'test.dummy.driver1@ridendine.local', 'approved', 4.90, 37, 'car', 'White sedan', true, now(), now()),
    ('30000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000202', 'Test Dummy', 'Driver 2', '+14165550202', 'test.dummy.driver2@ridendine.local', 'approved', 4.70, 21, 'bike', 'Cargo bike', false, now(), now()),
    ('30000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000203', 'Test Dummy', 'Driver 3', '+14165550203', 'test.dummy.driver3@ridendine.local', 'approved', 4.80, 44, 'car', 'Black compact SUV', true, now(), now())
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        status = excluded.status,
        updated_at = now();

  insert into public.driver_presence (id, driver_id, status, current_lat, current_lng, last_location_update, last_location_at, last_location_lat, last_location_lng, last_updated_at, updated_at)
  values
    ('31000000-0000-0000-0000-000000000201', '30000000-0000-0000-0000-000000000201', 'online', 43.6510, -79.3830, now(), now(), 43.6510, -79.3830, now(), now()),
    ('31000000-0000-0000-0000-000000000202', '30000000-0000-0000-0000-000000000202', 'busy', 43.6468, -79.3772, now(), now(), 43.6468, -79.3772, now(), now()),
    ('31000000-0000-0000-0000-000000000203', '30000000-0000-0000-0000-000000000203', 'offline', 43.6550, -79.3900, now(), now(), 43.6550, -79.3900, now(), now())
  on conflict (driver_id) do update
    set status = excluded.status,
        current_lat = excluded.current_lat,
        current_lng = excluded.current_lng,
        updated_at = now();

  insert into public.customers (id, user_id, first_name, last_name, phone, email, created_at, updated_at)
  values
    ('40000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000301', 'Test Dummy', 'Customer 1', '+14165550301', 'test.dummy.customer1@ridendine.local', now(), now()),
    ('40000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000302', 'Test Dummy', 'Customer 2', '+14165550302', 'test.dummy.customer2@ridendine.local', now(), now()),
    ('40000000-0000-0000-0000-000000000303', '10000000-0000-0000-0000-000000000303', 'Test Dummy', 'Customer 3', '+14165550303', 'test.dummy.customer3@ridendine.local', now(), now())
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        updated_at = now();

  insert into public.customer_addresses (id, customer_id, label, street_address, city, state, postal_code, country, lat, lng, delivery_instructions, is_default, created_at, updated_at)
  values
    ('41000000-0000-0000-0000-000000000301', '40000000-0000-0000-0000-000000000301', 'Home', '201 Queen Street West', 'Toronto', 'ON', 'M5V 1Z4', 'CA', 43.6509, -79.3902, 'Seeded local test address 1.', true, now(), now()),
    ('41000000-0000-0000-0000-000000000302', '40000000-0000-0000-0000-000000000302', 'Home', '202 Queen Street West', 'Toronto', 'ON', 'M5V 1Z5', 'CA', 43.6515, -79.3912, 'Seeded local test address 2.', true, now(), now()),
    ('41000000-0000-0000-0000-000000000303', '40000000-0000-0000-0000-000000000303', 'Home', '203 Queen Street West', 'Toronto', 'ON', 'M5V 1Z6', 'CA', 43.6521, -79.3920, 'Seeded local test address 3.', true, now(), now())
  on conflict (id) do update
    set street_address = excluded.street_address,
        is_default = excluded.is_default,
        updated_at = now();

  insert into public.orders (id, order_number, customer_id, storefront_id, delivery_address_id, status, subtotal, delivery_fee, service_fee, tax, tip, total, payment_status, payment_intent_id, special_instructions, estimated_ready_at, actual_ready_at, engine_status, estimated_prep_minutes, actual_prep_minutes, prep_started_at, ready_at, completed_at, exception_count, public_stage, created_at, updated_at)
  values
    ('50000000-0000-0000-0000-000000000001', 'RDDUMMY-0001', '40000000-0000-0000-0000-000000000301', '22000000-0000-0000-0000-000000000101', '41000000-0000-0000-0000-000000000301', 'delivered', 18.50, 4.99, 1.85, 3.30, 5.00, 33.64, 'completed', 'pi_local_dummy_1', 'Seeded completed test order.', now() - interval '45 minutes', now() - interval '40 minutes', 'delivered', 20, 21, now() - interval '65 minutes', now() - interval '42 minutes', now() - interval '15 minutes', 0, 'delivered', now() - interval '90 minutes', now()),
    ('50000000-0000-0000-0000-000000000002', 'RDDUMMY-0002', '40000000-0000-0000-0000-000000000302', '22000000-0000-0000-0000-000000000102', '41000000-0000-0000-0000-000000000302', 'in_transit', 21.00, 4.99, 2.10, 3.65, 4.00, 35.74, 'completed', 'pi_local_dummy_2', 'Seeded active delivery test order.', now() + interval '5 minutes', now() - interval '10 minutes', 'in_transit', 24, 24, now() - interval '35 minutes', now() - interval '12 minutes', null, 1, 'on_the_way', now() - interval '50 minutes', now()),
    ('50000000-0000-0000-0000-000000000003', 'RDDUMMY-0003', '40000000-0000-0000-0000-000000000303', '22000000-0000-0000-0000-000000000103', '41000000-0000-0000-0000-000000000303', 'preparing', 24.75, 5.99, 2.48, 4.31, 6.00, 43.53, 'processing', 'pi_local_dummy_3', 'Seeded kitchen queue test order.', now() + interval '20 minutes', null, 'preparing', 20, null, now() - interval '8 minutes', null, null, 0, 'cooking', now() - interval '20 minutes', now())
  on conflict (order_number) do update
    set status = excluded.status,
        payment_status = excluded.payment_status,
        engine_status = excluded.engine_status,
        public_stage = excluded.public_stage,
        updated_at = now();

  insert into public.deliveries (id, order_id, driver_id, status, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, estimated_pickup_at, actual_pickup_at, estimated_dropoff_at, actual_dropoff_at, distance_km, delivery_fee, driver_payout, notes, assignment_attempts_count, last_assignment_at, escalated_to_ops, escalated_at, route_to_pickup_meters, route_to_pickup_seconds, eta_pickup_at, route_to_dropoff_meters, route_to_dropoff_seconds, eta_dropoff_at, route_progress_pct, routing_provider, routing_computed_at, created_at, updated_at)
  values
    ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000201', 'delivered', '101 King Street West, Toronto, ON', 43.6487, -79.3817, '201 Queen Street West, Toronto, ON', 43.6509, -79.3902, now() - interval '55 minutes', now() - interval '50 minutes', now() - interval '20 minutes', now() - interval '15 minutes', 3.40, 4.99, 7.50, 'Seeded delivered local test delivery.', 1, now() - interval '70 minutes', false, null, 1200, 360, now() - interval '50 minutes', 3400, 900, now() - interval '15 minutes', 100, 'local_seed', now(), now() - interval '85 minutes', now()),
    ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000202', 'en_route_to_dropoff', '102 King Street West, Toronto, ON', 43.6492, -79.3830, '202 Queen Street West, Toronto, ON', 43.6515, -79.3912, now() - interval '15 minutes', now() - interval '12 minutes', now() + interval '10 minutes', null, 2.80, 4.99, 7.00, 'Seeded active local test delivery.', 2, now() - interval '30 minutes', true, now() - interval '5 minutes', 900, 300, now() - interval '12 minutes', 2800, 720, now() + interval '10 minutes', 58, 'local_seed', now(), now() - interval '45 minutes', now()),
    ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', null, 'pending', '103 King Street West, Toronto, ON', 43.6501, -79.3841, '203 Queen Street West, Toronto, ON', 43.6521, -79.3920, now() + interval '18 minutes', null, now() + interval '40 minutes', null, 3.10, 5.99, 8.25, 'Seeded unassigned local test delivery.', 0, null, false, null, null, null, null, null, null, null, 0, 'local_seed', now(), now() - interval '18 minutes', now())
  on conflict (order_id) do update
    set driver_id = excluded.driver_id,
        status = excluded.status,
        escalated_to_ops = excluded.escalated_to_ops,
        route_progress_pct = excluded.route_progress_pct,
        updated_at = now();

  insert into public.ledger_entries (id, order_id, entry_type, amount_cents, currency, description, entity_type, entity_id, metadata, idempotency_key, created_at)
  values
    ('70000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000001', 'customer_charge_capture', 3364, 'CAD', 'Dummy order 1 customer charge', 'customer', '40000000-0000-0000-0000-000000000301', '{"source":"local_seed"}', 'local-dummy-1-charge', now() - interval '89 minutes'),
    ('70000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000001', 'platform_fee', 185, 'CAD', 'Dummy order 1 platform fee', 'platform', admin_user, '{"source":"local_seed"}', 'local-dummy-1-platform', now() - interval '88 minutes'),
    ('70000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000001', 'chef_payable', 1480, 'CAD', 'Dummy order 1 chef payable', 'chef', '20000000-0000-0000-0000-000000000101', '{"source":"local_seed"}', 'local-dummy-1-chef', now() - interval '87 minutes'),
    ('70000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000001', 'driver_payable', 750, 'CAD', 'Dummy order 1 driver payable', 'driver', '30000000-0000-0000-0000-000000000201', '{"source":"local_seed"}', 'local-dummy-1-driver', now() - interval '86 minutes'),
    ('70000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000001', 'tip_payable', 500, 'CAD', 'Dummy order 1 tip payable', 'driver', '30000000-0000-0000-0000-000000000201', '{"source":"local_seed"}', 'local-dummy-1-tip', now() - interval '85 minutes'),
    ('70000000-0000-0000-0000-000000000016', '50000000-0000-0000-0000-000000000001', 'tax_collected', 330, 'CAD', 'Dummy order 1 tax collected', 'platform', admin_user, '{"source":"local_seed"}', 'local-dummy-1-tax', now() - interval '84 minutes'),
    ('70000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000002', 'customer_charge_capture', 3574, 'CAD', 'Dummy order 2 customer charge', 'customer', '40000000-0000-0000-0000-000000000302', '{"source":"local_seed"}', 'local-dummy-2-charge', now() - interval '49 minutes'),
    ('70000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000002', 'platform_fee', 210, 'CAD', 'Dummy order 2 platform fee', 'platform', admin_user, '{"source":"local_seed"}', 'local-dummy-2-platform', now() - interval '48 minutes'),
    ('70000000-0000-0000-0000-000000000023', '50000000-0000-0000-0000-000000000002', 'chef_payable', 1680, 'CAD', 'Dummy order 2 chef payable', 'chef', '20000000-0000-0000-0000-000000000102', '{"source":"local_seed"}', 'local-dummy-2-chef', now() - interval '47 minutes'),
    ('70000000-0000-0000-0000-000000000024', '50000000-0000-0000-0000-000000000002', 'driver_payable', 700, 'CAD', 'Dummy order 2 driver payable', 'driver', '30000000-0000-0000-0000-000000000202', '{"source":"local_seed"}', 'local-dummy-2-driver', now() - interval '46 minutes'),
    ('70000000-0000-0000-0000-000000000025', '50000000-0000-0000-0000-000000000002', 'tip_payable', 400, 'CAD', 'Dummy order 2 tip payable', 'driver', '30000000-0000-0000-0000-000000000202', '{"source":"local_seed"}', 'local-dummy-2-tip', now() - interval '45 minutes'),
    ('70000000-0000-0000-0000-000000000026', '50000000-0000-0000-0000-000000000002', 'tax_collected', 365, 'CAD', 'Dummy order 2 tax collected', 'platform', admin_user, '{"source":"local_seed"}', 'local-dummy-2-tax', now() - interval '44 minutes'),
    ('70000000-0000-0000-0000-000000000031', '50000000-0000-0000-0000-000000000003', 'customer_charge_capture', 4353, 'CAD', 'Dummy order 3 customer charge', 'customer', '40000000-0000-0000-0000-000000000303', '{"source":"local_seed"}', 'local-dummy-3-charge', now() - interval '19 minutes'),
    ('70000000-0000-0000-0000-000000000032', '50000000-0000-0000-0000-000000000003', 'platform_fee', 248, 'CAD', 'Dummy order 3 platform fee', 'platform', admin_user, '{"source":"local_seed"}', 'local-dummy-3-platform', now() - interval '18 minutes'),
    ('70000000-0000-0000-0000-000000000033', '50000000-0000-0000-0000-000000000003', 'chef_payable', 1980, 'CAD', 'Dummy order 3 chef payable', 'chef', '20000000-0000-0000-0000-000000000103', '{"source":"local_seed"}', 'local-dummy-3-chef', now() - interval '17 minutes'),
    ('70000000-0000-0000-0000-000000000034', '50000000-0000-0000-0000-000000000003', 'driver_payable', 825, 'CAD', 'Dummy order 3 driver payable', 'driver', '30000000-0000-0000-0000-000000000203', '{"source":"local_seed"}', 'local-dummy-3-driver', now() - interval '16 minutes'),
    ('70000000-0000-0000-0000-000000000035', '50000000-0000-0000-0000-000000000003', 'tip_payable', 600, 'CAD', 'Dummy order 3 tip payable', 'driver', '30000000-0000-0000-0000-000000000203', '{"source":"local_seed"}', 'local-dummy-3-tip', now() - interval '15 minutes'),
    ('70000000-0000-0000-0000-000000000036', '50000000-0000-0000-0000-000000000003', 'tax_collected', 431, 'CAD', 'Dummy order 3 tax collected', 'platform', admin_user, '{"source":"local_seed"}', 'local-dummy-3-tax', now() - interval '14 minutes')
  on conflict (id) do update
    set amount_cents = excluded.amount_cents,
        description = excluded.description,
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        created_at = excluded.created_at;

  insert into public.platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency, updated_at)
  values
    ('chef_payable', '20000000-0000-0000-0000-000000000101', 1480, 1480, 1480, 'CAD', now()),
    ('chef_payable', '20000000-0000-0000-0000-000000000102', 1680, 1680, 1680, 'CAD', now()),
    ('chef_payable', '20000000-0000-0000-0000-000000000103', 1980, 1980, 1980, 'CAD', now()),
    ('driver_payable', '30000000-0000-0000-0000-000000000201', 1250, 1250, 1250, 'CAD', now()),
    ('driver_payable', '30000000-0000-0000-0000-000000000202', 1100, 1100, 1100, 'CAD', now()),
    ('driver_payable', '30000000-0000-0000-0000-000000000203', 1425, 1425, 1425, 'CAD', now()),
    ('platform_revenue', admin_user, 643, 0, 643, 'CAD', now())
  on conflict (account_type, owner_id) do update
    set balance_cents = excluded.balance_cents,
        pending_payout_cents = excluded.pending_payout_cents,
        lifetime_earned_cents = excluded.lifetime_earned_cents,
        updated_at = now();

  insert into public.order_exceptions (id, exception_type, severity, status, order_id, customer_id, chef_id, driver_id, delivery_id, title, description, recommended_actions, sla_deadline, escalated_at, created_at, updated_at)
  values
    ('60000000-0000-0000-0000-000000000002', 'delivery_delay', 'medium', 'open', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000302', '20000000-0000-0000-0000-000000000102', '30000000-0000-0000-0000-000000000202', '51000000-0000-0000-0000-000000000002', 'Test Dummy Delivery Delay', 'Seeded exception so ops monitoring has an active item.', '[{"label":"Contact driver"},{"label":"Notify customer"}]', now() + interval '20 minutes', now() - interval '5 minutes', now() - interval '6 minutes', now())
  on conflict (id) do update
    set status = excluded.status,
        severity = excluded.severity,
        updated_at = now();

  insert into public.refund_cases (id, order_id, exception_id, requested_by, requested_amount_cents, approved_amount_cents, refund_reason, refund_notes, status, created_at, updated_at)
  values
    ('61000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', admin_user, 650, null, 'delivery_delay', 'Seeded pending refund for finance workflow testing.', 'pending', now() - interval '4 minutes', now())
  on conflict (id) do update
    set status = excluded.status,
        requested_amount_cents = excluded.requested_amount_cents,
        updated_at = now();

  insert into public.payout_adjustments (id, payee_type, payee_id, order_id, adjustment_type, amount_cents, reason, status, created_by, created_at, updated_at)
  values
    ('62000000-0000-0000-0000-000000000002', 'driver', '30000000-0000-0000-0000-000000000202', '50000000-0000-0000-0000-000000000002', 'hold', 350, 'Seeded local payout hold for finance workflow testing.', 'pending', admin_user, now() - interval '3 minutes', now())
  on conflict (id) do update
    set status = excluded.status,
        amount_cents = excluded.amount_cents,
        updated_at = now();

  insert into public.system_alerts (id, alert_type, severity, title, message, entity_type, entity_id, acknowledged, metadata, created_at)
  values
    ('63000000-0000-0000-0000-000000000002', 'engine_test_seed', 'warning', 'Test Dummy Finance Workflow Active', 'Seeded local alert connected to RDDUMMY-0002.', 'order', '50000000-0000-0000-0000-000000000002', false, '{"source":"local_seed"}', now() - interval '2 minutes')
  on conflict (id) do update
    set severity = excluded.severity,
        title = excluded.title,
        acknowledged = false,
        metadata = excluded.metadata;

  insert into public.promo_codes (
    id,
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount,
    usage_limit,
    usage_count,
    starts_at,
    expires_at,
    is_active,
    valid_from,
    valid_until,
    max_uses,
    times_used,
    created_at,
    updated_at
  )
  values (
    '68000000-0000-0000-0000-000000000001',
    'TESTDUMMY10',
    'Seeded promo for Test Dummy Customer 1.',
    'percentage',
    10,
    15,
    10,
    100,
    1,
    now() - interval '1 day',
    now() + interval '30 days',
    true,
    now() - interval '1 day',
    now() + interval '30 days',
    100,
    1,
    now(),
    now()
  )
  on conflict (code) do update
    set description = excluded.description,
        discount_type = excluded.discount_type,
        discount_value = excluded.discount_value,
        is_active = excluded.is_active,
        updated_at = now();

  insert into public.support_tickets (
    id,
    order_id,
    customer_id,
    chef_id,
    driver_id,
    subject,
    description,
    status,
    priority,
    assigned_to,
    created_at,
    updated_at
  )
  values (
    '66000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000302',
    '20000000-0000-0000-0000-000000000102',
    '30000000-0000-0000-0000-000000000202',
    'Test Dummy Delivery Support Case',
    'Seeded support case linked to RDDUMMY-0002 for ops support testing.',
    'open',
    'high',
    admin_user,
    now() - interval '10 minutes',
    now()
  )
  on conflict (id) do update
    set status = excluded.status,
        priority = excluded.priority,
        assigned_to = excluded.assigned_to,
        updated_at = now();

  insert into public.notifications (id, user_id, type, title, body, message, data, is_read, created_at)
  values (
    '67000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000301',
    'announcement',
    'Test Dummy Announcement',
    'Seeded announcement notification for Test Dummy Customer 1.',
    'Seeded announcement notification for Test Dummy Customer 1.',
    '{"source":"local_seed","audience":"all_customers"}',
    false,
    now() - interval '9 minutes'
  )
  on conflict (id) do update
    set title = excluded.title,
        body = excluded.body,
        message = excluded.message,
        data = excluded.data,
        is_read = false;

  insert into public.payout_runs (
    id,
    run_type,
    status,
    period_start,
    period_end,
    total_amount,
    total_recipients,
    successful_payouts,
    failed_payouts,
    initiated_by,
    completed_at,
    created_at,
    updated_at
  )
  values (
    '64000000-0000-0000-0000-000000000001',
    'driver',
    'completed',
    now() - interval '1 day',
    now(),
    1250,
    1,
    1,
    0,
    admin_user,
    now() - interval '7 minutes',
    now() - interval '8 minutes',
    now()
  )
  on conflict (id) do update
    set status = excluded.status,
        total_amount = excluded.total_amount,
        total_recipients = excluded.total_recipients,
        successful_payouts = excluded.successful_payouts,
        failed_payouts = excluded.failed_payouts,
        updated_at = now();

  insert into public.driver_payouts (
    id,
    driver_id,
    payout_run_id,
    amount,
    status,
    stripe_transfer_id,
    period_start,
    period_end,
    created_at,
    updated_at
  )
  values (
    '69000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000201',
    '64000000-0000-0000-0000-000000000001',
    1250,
    'completed',
    'tr_local_dummy_driver_1',
    now() - interval '1 day',
    now(),
    now() - interval '8 minutes',
    now()
  )
  on conflict (id) do update
    set amount = excluded.amount,
        status = excluded.status,
        payout_run_id = excluded.payout_run_id,
        updated_at = now();

  insert into public.chef_payouts (
    id,
    chef_id,
    stripe_transfer_id,
    amount,
    status,
    period_start,
    period_end,
    orders_count,
    created_at,
    paid_at
  )
  values (
    '6a000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000101',
    'tr_local_dummy_chef_1',
    1480,
    'paid',
    now() - interval '7 days',
    now(),
    1,
    now() - interval '7 minutes',
    now() - interval '6 minutes'
  )
  on conflict (id) do update
    set amount = excluded.amount,
        status = excluded.status,
        paid_at = excluded.paid_at;

  insert into public.ledger_entries (id, order_id, entry_type, amount_cents, currency, description, entity_type, entity_id, metadata, idempotency_key, created_at)
  values
    ('70000000-0000-0000-0000-000000000041', '50000000-0000-0000-0000-000000000001', 'payout_debit', -1250, 'CAD', 'Dummy driver payout debit for payout run', 'driver', '30000000-0000-0000-0000-000000000201', '{"source":"local_seed","payout_run_id":"64000000-0000-0000-0000-000000000001"}', 'local-dummy-payout-run-driver-debit', now() - interval '7 minutes'),
    ('70000000-0000-0000-0000-000000000042', '50000000-0000-0000-0000-000000000001', 'payout_debit', -1480, 'CAD', 'Dummy chef payout debit for payout testing', 'chef', '20000000-0000-0000-0000-000000000101', '{"source":"local_seed","payout_run_id":"64000000-0000-0000-0000-000000000001"}', 'local-dummy-payout-run-chef-debit', now() - interval '6 minutes')
  on conflict (id) do update
    set amount_cents = excluded.amount_cents,
        metadata = excluded.metadata,
        description = excluded.description,
        created_at = excluded.created_at;

  insert into public.stripe_events_processed (
    id,
    stripe_event_id,
    event_type,
    livemode,
    processed_at,
    processing_status,
    related_order_id,
    payload_hash,
    created_at
  )
  values (
    '6b000000-0000-0000-0000-000000000001',
    'evt_local_dummy_reconciliation_1',
    'charge.succeeded',
    false,
    now() - interval '5 minutes',
    'processed',
    '50000000-0000-0000-0000-000000000001',
    'local-dummy-hash',
    now() - interval '5 minutes'
  )
  on conflict (stripe_event_id) do update
    set processing_status = excluded.processing_status,
        related_order_id = excluded.related_order_id,
        processed_at = excluded.processed_at;

  insert into public.stripe_reconciliation (
    id,
    stripe_event_id,
    ledger_entry_ids,
    status,
    variance_cents,
    notes,
    created_at
  )
  values (
    '65000000-0000-0000-0000-000000000001',
    'evt_local_dummy_reconciliation_1',
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'matched',
    0,
    'Seeded matched Stripe reconciliation row for finance testing.',
    now() - interval '4 minutes'
  )
  on conflict (stripe_event_id) do update
    set ledger_entry_ids = excluded.ledger_entry_ids,
        status = excluded.status,
        variance_cents = excluded.variance_cents,
        notes = excluded.notes;
end $$;
