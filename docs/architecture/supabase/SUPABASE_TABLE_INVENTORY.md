# Supabase Table Inventory

Generated from `supabase/migrations/*.sql`. This is migration-derived, so it is meant to show the intended repo schema, not a live database introspection snapshot.

## admin_notes

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 0

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| entity_type | VARCHAR(20) | required | - |
| entity_id | UUID | required | - |
| note | TEXT | required | - |
| created_by | UUID | FK, required | auth.users.id |
| created_at | TIMESTAMPTZ | required, default | - |

## analytics_events

Source migrations: supabase/migrations/00013_analytics_events.sql

RLS: enabled

Policies detected: 3

Indexes detected: 4

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| event_name | VARCHAR(100) | required | - |
| properties | JSONB | default | - |
| user_id | UUID | - | - |
| session_id | TEXT | - | - |
| page_url | TEXT | - | - |
| referrer | TEXT | - | - |
| user_agent | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |

## assignment_attempts

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 2

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| delivery_id | UUID | FK, required | deliveries.id |
| driver_id | UUID | FK, required | drivers.id |
| attempt_number | INTEGER | required, default | - |
| offered_at | TIMESTAMPTZ | required, default | - |
| expires_at | TIMESTAMPTZ | required | - |
| responded_at | TIMESTAMPTZ | - | - |
| response | VARCHAR(20) | required, default | - |
| decline_reason | VARCHAR(255) | - | - |
| distance_meters | INTEGER | - | - |
| estimated_minutes | INTEGER | - | - |
| created_at | TIMESTAMPTZ | required, default | - |

## audit_logs

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00009_ops_admin_control_plane.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00012_schema_drift_cleanup.sql

RLS: enabled

Policies detected: 2

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| actor_type | VARCHAR(20) | default | - |
| actor_id | UUID | - | - |
| action | VARCHAR(100) | - | - |
| entity_type | VARCHAR(50) | - | - |
| entity_id | UUID | - | - |
| old_data | JSONB | - | - |
| new_data | JSONB | - | - |
| ip_address | INET | - | - |
| user_agent | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| actor_role | TEXT | - | - |
| reason | TEXT | - | - |
| metadata | JSONB | - | - |
| user_id | UUID | - | - |

## cart_items

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| cart_id | UUID | FK, required | carts.id |
| menu_item_id | UUID | FK, required | menu_items.id |
| quantity | INTEGER | required, default | - |
| unit_price | DECIMAL(10, 2) | required | - |
| special_instructions | TEXT | - | - |
| selected_options | JSONB | default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## carts

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| customer_id | UUID | FK, required | customers.id |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## checkout_idempotency_keys

Source migrations: supabase/migrations/00018_phase_c_checkout_idempotency.sql

RLS: enabled

Policies detected: 0

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| customer_id | UUID | FK, required | customers.id |
| idempotency_key | VARCHAR(128) | required | - |
| request_hash | VARCHAR(128) | required | - |
| status | VARCHAR(20) | required, default | - |
| order_id | UUID | FK | orders.id |
| payment_intent_id | VARCHAR(255) | - | - |
| response_payload | JSONB | - | - |
| last_error | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## chef_availability

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 1

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| day_of_week | INTEGER | required | - |
| start_time | TIME | required | - |
| end_time | TIME | required | - |
| is_available | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## chef_delivery_zones

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 1

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| name | VARCHAR(100) | required | - |
| radius_km | DECIMAL(5, 2) | - | - |
| polygon | GEOMETRY(POLYGON, 4326) | - | - |
| delivery_fee | DECIMAL(10, 2) | required, default | - |
| min_order_for_free_delivery | DECIMAL(10, 2) | - | - |
| estimated_delivery_min | INTEGER | required, default | - |
| estimated_delivery_max | INTEGER | required, default | - |
| is_active | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## chef_documents

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 0

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| chef_id | UUID | FK, required | chef_profiles.id |
| document_type | VARCHAR(50) | required | - |
| document_url | TEXT | required | - |
| status | VARCHAR(20) | required, default | - |
| expires_at | TIMESTAMPTZ | - | - |
| notes | TEXT | - | - |
| reviewed_by | UUID | FK | auth.users.id |
| reviewed_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## chef_kitchens

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00010_contract_drift_repair.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| chef_id | UUID | FK, required | chef_profiles.id |
| name | VARCHAR(100) | required | - |
| address_line1 | VARCHAR(255) | required | - |
| address_line2 | VARCHAR(255) | - | - |
| city | VARCHAR(100) | required | - |
| state | VARCHAR(50) | required | - |
| postal_code | VARCHAR(20) | required | - |
| country | VARCHAR(50) | required, default | - |
| lat | DECIMAL(10, 8) | - | - |
| lng | DECIMAL(11, 8) | - | - |
| is_verified | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| phone | VARCHAR(20) | - | - |
| address | TEXT | - | - |

## chef_payout_accounts

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00004_additions.sql, supabase/migrations/00011_rls_role_alignment.sql, supabase/migrations/00012_schema_drift_cleanup.sql, supabase/migrations/00024_canonical_consolidation.sql, supabase/migrations/00025_rls_role_alignment.sql

RLS: enabled

Policies detected: 3

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| chef_id | UUID | FK, required, unique | chef_profiles.id |
| stripe_account_id | TEXT | required | - |
| is_verified | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| stripe_account_status | TEXT | default | - |
| payout_enabled | BOOLEAN | default | - |

## chef_payouts

Source migrations: supabase/migrations/00004_additions.sql, supabase/migrations/00011_rls_role_alignment.sql, supabase/migrations/00021_finance_hardening.sql, supabase/migrations/00022_bank_payout_rail.sql, supabase/migrations/00025_rls_role_alignment.sql

RLS: enabled

Policies detected: 3

Indexes detected: 7

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| chef_id | UUID | FK, required | chef_profiles.id |
| stripe_transfer_id | TEXT | - | - |
| amount | INTEGER | required | - |
| status | TEXT | required, default | - |
| period_start | TIMESTAMPTZ | required | - |
| period_end | TIMESTAMPTZ | required | - |
| orders_count | INTEGER | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| paid_at | TIMESTAMPTZ | - | - |
| payout_run_id | UUID | FK | payout_runs.id |
| payment_rail | TEXT | required, default | - |
| bank_batch_id | TEXT | - | - |
| bank_reference | TEXT | - | - |
| reconciliation_status | TEXT | required, default | - |
| approved_by | UUID | FK | auth.users.id |
| approved_at | TIMESTAMPTZ | - | - |
| executed_by | UUID | FK | auth.users.id |
| executed_at | TIMESTAMPTZ | - | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## chef_profiles

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00030_seed_data_user_id_nullable.sql, supabase/migrations/00034_restore_user_id_fks.sql, supabase/migrations/00035_chef_profiles_public_read.sql, supabase/migrations/00038_validate_user_id_fks.sql

RLS: enabled

Policies detected: 7

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| display_name | VARCHAR(100) | required | - |
| bio | TEXT | - | - |
| profile_image_url | TEXT | - | - |
| phone | VARCHAR(20) | - | - |
| status | VARCHAR(20) | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## chef_storefronts

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00006_fix_order_items.sql, supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00017_phase_b_security_rls_hardening.sql

RLS: enabled

Policies detected: 6

Indexes detected: 4

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| chef_id | UUID | FK, required | chef_profiles.id |
| kitchen_id | UUID | FK, required | chef_kitchens.id |
| slug | VARCHAR(100) | required, unique | - |
| name | VARCHAR(100) | required | - |
| description | TEXT | - | - |
| cuisine_types | TEXT[] | default | - |
| cover_image_url | TEXT | - | - |
| logo_url | TEXT | - | - |
| is_active | BOOLEAN | required, default | - |
| is_featured | BOOLEAN | required, default | - |
| average_rating | DECIMAL(2, 1) | - | - |
| total_reviews | INTEGER | required, default | - |
| min_order_amount | DECIMAL(10, 2) | required, default | - |
| estimated_prep_time_min | INTEGER | required, default | - |
| estimated_prep_time_max | INTEGER | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| address | TEXT | - | - |
| storefront_state | VARCHAR(50) | default | - |
| is_paused | BOOLEAN | default | - |
| paused_reason | TEXT | - | - |
| paused_at | TIMESTAMPTZ | - | - |
| paused_by | UUID | FK | auth.users.id |
| current_queue_size | INTEGER | default | - |
| max_queue_size | INTEGER | default | - |
| is_overloaded | BOOLEAN | default | - |
| average_prep_minutes | INTEGER | default | - |
| phone | VARCHAR(20) | - | - |

## customer_addresses

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00006_fix_order_items.sql

RLS: enabled

Policies detected: 3

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| customer_id | UUID | FK, required | customers.id |
| label | VARCHAR(50) | required | - |
| city | VARCHAR(100) | required | - |
| state | VARCHAR(50) | required | - |
| postal_code | VARCHAR(20) | required | - |
| country | VARCHAR(50) | required, default | - |
| lat | DECIMAL(10, 8) | - | - |
| lng | DECIMAL(11, 8) | - | - |
| delivery_instructions | TEXT | - | - |
| is_default | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| street_address | VARCHAR(255) | required | - |

## customers

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00030_seed_data_user_id_nullable.sql, supabase/migrations/00034_restore_user_id_fks.sql, supabase/migrations/00038_validate_user_id_fks.sql

RLS: enabled

Policies detected: 6

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| first_name | VARCHAR(50) | required | - |
| last_name | VARCHAR(50) | required | - |
| phone | VARCHAR(20) | - | - |
| email | VARCHAR(255) | required | - |
| profile_image_url | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## deliveries

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00019_business_engine.sql

RLS: enabled

Policies detected: 8

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK, required | orders.id |
| driver_id | UUID | FK | drivers.id |
| status | VARCHAR(30) | required, default | - |
| pickup_address | TEXT | required | - |
| pickup_lat | DECIMAL(10, 8) | - | - |
| pickup_lng | DECIMAL(11, 8) | - | - |
| dropoff_address | TEXT | required | - |
| dropoff_lat | DECIMAL(10, 8) | - | - |
| dropoff_lng | DECIMAL(11, 8) | - | - |
| estimated_pickup_at | TIMESTAMPTZ | - | - |
| actual_pickup_at | TIMESTAMPTZ | - | - |
| estimated_dropoff_at | TIMESTAMPTZ | - | - |
| actual_dropoff_at | TIMESTAMPTZ | - | - |
| distance_km | DECIMAL(10, 2) | - | - |
| delivery_fee | DECIMAL(10, 2) | required | - |
| driver_payout | DECIMAL(10, 2) | required | - |
| pickup_photo_url | TEXT | - | - |
| dropoff_photo_url | TEXT | - | - |
| customer_signature_url | TEXT | - | - |
| notes | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| assignment_attempts_count | INTEGER | default | - |
| last_assignment_at | TIMESTAMPTZ | - | - |
| escalated_to_ops | BOOLEAN | default | - |
| escalated_at | TIMESTAMPTZ | - | - |
| pickup_proof_url | TEXT | - | - |
| dropoff_proof_url | TEXT | - | - |
| delivery_notes | TEXT | - | - |
| route_to_pickup_polyline | TEXT | - | - |
| route_to_pickup_meters | INTEGER | - | - |
| route_to_pickup_seconds | INTEGER | - | - |
| eta_pickup_at | TIMESTAMPTZ | - | - |
| route_to_dropoff_polyline | TEXT | - | - |
| route_to_dropoff_meters | INTEGER | - | - |
| route_to_dropoff_seconds | INTEGER | - | - |
| eta_dropoff_at | TIMESTAMPTZ | - | - |
| route_progress_pct | NUMERIC(5 | - | - |
| routing_provider | TEXT | default | - |
| routing_computed_at | TIMESTAMPTZ | - | - |

## delivery_assignments

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql

RLS: enabled

Policies detected: 5

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| delivery_id | UUID | FK, required | deliveries.id |
| driver_id | UUID | FK, required | drivers.id |
| offered_at | TIMESTAMPTZ | required, default | - |
| expires_at | TIMESTAMPTZ | required | - |
| responded_at | TIMESTAMPTZ | - | - |
| response | VARCHAR(20) | - | - |
| rejection_reason | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |

## delivery_events

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 0

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| delivery_id | UUID | FK, required | deliveries.id |
| event_type | VARCHAR(50) | required | - |
| event_data | JSONB | - | - |
| actor_type | VARCHAR(20) | required | - |
| actor_id | UUID | - | - |
| created_at | TIMESTAMPTZ | required, default | - |

## delivery_tracking_events

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 0

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| delivery_id | UUID | FK, required | deliveries.id |
| driver_id | UUID | FK, required | drivers.id |
| lat | DECIMAL(10, 8) | required | - |
| lng | DECIMAL(11, 8) | required | - |
| accuracy | DECIMAL(10, 2) | - | - |
| recorded_at | TIMESTAMPTZ | required, default | - |

## domain_events

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 2

Indexes detected: 4

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| event_type | VARCHAR(100) | required | - |
| entity_type | VARCHAR(50) | required | - |
| entity_id | UUID | required | - |
| payload | JSONB | required, default | - |
| actor_user_id | UUID | FK | auth.users.id |
| actor_role | VARCHAR(50) | required | - |
| actor_entity_id | UUID | - | - |
| version | INTEGER | required, default | - |
| published | BOOLEAN | required, default | - |
| published_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |

## driver_documents

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00039_driver_documents_ops_read.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| document_type | VARCHAR(50) | required | - |
| document_url | TEXT | required | - |
| status | VARCHAR(20) | required, default | - |
| expires_at | TIMESTAMPTZ | - | - |
| notes | TEXT | - | - |
| reviewed_by | UUID | FK | auth.users.id |
| reviewed_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## driver_earnings

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql

RLS: enabled

Policies detected: 3

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| delivery_id | UUID | required | - |
| shift_id | UUID | FK | driver_shifts.id |
| base_amount | DECIMAL(10, 2) | required | - |
| tip_amount | DECIMAL(10, 2) | required, default | - |
| bonus_amount | DECIMAL(10, 2) | required, default | - |
| total_amount | DECIMAL(10, 2) | required | - |
| created_at | TIMESTAMPTZ | required, default | - |

## driver_locations

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00004_additions.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00011_rls_role_alignment.sql, supabase/migrations/00012_schema_drift_cleanup.sql, supabase/migrations/00025_rls_role_alignment.sql

RLS: enabled

Policies detected: 5

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| shift_id | UUID | FK | driver_shifts.id |
| lat | DECIMAL(10, 8) | required | - |
| lng | DECIMAL(11, 8) | required | - |
| accuracy | DECIMAL(10, 2) | - | - |
| heading | DECIMAL(5, 2) | - | - |
| speed | DECIMAL(10, 2) | - | - |
| recorded_at | TIMESTAMPTZ | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |

## driver_payout_accounts

Source migrations: supabase/migrations/00026_driver_payout_accounts.sql

RLS: enabled

Policies detected: 2

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required, unique | drivers.id |
| stripe_account_id | TEXT | required | - |
| status | TEXT | required, default | - |
| charges_enabled | BOOLEAN | required, default | - |
| payouts_enabled | BOOLEAN | required, default | - |
| onboarding_completed_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## driver_payouts

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00021_finance_hardening.sql, supabase/migrations/00022_bank_payout_rail.sql

RLS: enabled

Policies detected: 0

Indexes detected: 4

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| payout_run_id | UUID | - | - |
| amount | DECIMAL(10, 2) | required | - |
| status | VARCHAR(20) | required, default | - |
| stripe_transfer_id | VARCHAR(255) | - | - |
| period_start | TIMESTAMPTZ | required | - |
| period_end | TIMESTAMPTZ | required | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| stripe_payout_id | TEXT | - | - |
| payment_rail | TEXT | required, default | - |
| bank_batch_id | TEXT | - | - |
| bank_reference | TEXT | - | - |
| reconciliation_status | TEXT | required, default | - |
| approved_by | UUID | FK | auth.users.id |
| approved_at | TIMESTAMPTZ | - | - |
| executed_by | UUID | FK | auth.users.id |
| executed_at | TIMESTAMPTZ | - | - |
| paid_at | TIMESTAMPTZ | - | - |

## driver_presence

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00004_additions.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00010_contract_drift_repair.sql

RLS: enabled

Policies detected: 3

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| status | VARCHAR(20) | required, default | - |
| current_lat | DECIMAL(10 | - | - |
| current_lng | DECIMAL(11 | - | - |
| last_location_update | TIMESTAMPTZ | - | - |
| current_shift_id | UUID | FK | driver_shifts.id |
| updated_at | TIMESTAMPTZ | required, default | - |
| last_location_at | TIMESTAMPTZ | - | - |
| last_location_lat | DECIMAL(10 | - | - |
| last_location_lng | DECIMAL(11 | - | - |
| last_updated_at | TIMESTAMPTZ | default | - |

## driver_shifts

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 1

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| started_at | TIMESTAMPTZ | required, default | - |
| ended_at | TIMESTAMPTZ | - | - |
| total_deliveries | INTEGER | required, default | - |
| total_earnings | DECIMAL(10, 2) | required, default | - |
| total_distance_km | DECIMAL(10, 2) | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## driver_vehicles

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| vehicle_type | VARCHAR(20) | required | - |
| make | VARCHAR(50) | - | - |
| model | VARCHAR(50) | - | - |
| year | INTEGER | - | - |
| color | VARCHAR(30) | - | - |
| license_plate | VARCHAR(20) | - | - |
| is_active | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## drivers

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00019_business_engine.sql, supabase/migrations/00021_finance_hardening.sql, supabase/migrations/00030_seed_data_user_id_nullable.sql, supabase/migrations/00034_restore_user_id_fks.sql, supabase/migrations/00038_validate_user_id_fks.sql

RLS: enabled

Policies detected: 6

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| first_name | VARCHAR(50) | required | - |
| last_name | VARCHAR(50) | required | - |
| phone | VARCHAR(20) | required | - |
| email | VARCHAR(255) | required | - |
| profile_image_url | TEXT | - | - |
| status | VARCHAR(20) | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| rating | DECIMAL(3 | - | - |
| total_deliveries | INTEGER | required, default | - |
| vehicle_type | VARCHAR(20) | - | - |
| vehicle_description | TEXT | - | - |
| instant_payouts_enabled | BOOLEAN | required, default | - |
| stripe_connect_account_id | TEXT | - | - |
| payout_blocked | BOOLEAN | required, default | - |

## favorites

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 2

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| customer_id | UUID | FK, required | customers.id |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| created_at | TIMESTAMPTZ | required, default | - |

## instant_payout_requests

Source migrations: supabase/migrations/00019_business_engine.sql

RLS: enabled

Policies detected: 3

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| driver_id | UUID | FK, required | drivers.id |
| amount_cents | BIGINT | required | - |
| fee_cents | BIGINT | required | - |
| status | TEXT | required, default | - |
| stripe_payout_id | TEXT | - | - |
| failure_reason | TEXT | - | - |
| requested_at | TIMESTAMPTZ | required, default | - |
| executed_at | TIMESTAMPTZ | - | - |

## kitchen_queue_entries

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 2

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| order_id | UUID | FK, required, unique | orders.id |
| position | INTEGER | required | - |
| estimated_prep_minutes | INTEGER | required, default | - |
| actual_prep_minutes | INTEGER | - | - |
| status | VARCHAR(20) | required, default | - |
| started_at | TIMESTAMPTZ | - | - |
| completed_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## ledger_entries

Source migrations: supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00019_business_engine.sql, supabase/migrations/00020_ledger_entries_order_optional.sql, supabase/migrations/00025_rls_role_alignment.sql, supabase/migrations/00031_security_hardening.sql

RLS: enabled

Policies detected: 3

Indexes detected: 7

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK, required | orders.id |
| entry_type | VARCHAR(50) | required | - |
| amount_cents | INTEGER | required | - |
| currency | VARCHAR(3) | required, default | - |
| description | VARCHAR(255) | - | - |
| entity_type | VARCHAR(50) | - | - |
| entity_id | UUID | - | - |
| stripe_id | VARCHAR(255) | - | - |
| metadata | JSONB | default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| idempotency_key | TEXT | - | - |

## loyalty_accounts

Source migrations: supabase/migrations/00027_loyalty_program.sql

RLS: enabled

Policies detected: 2

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| customer_id | UUID | FK, required | customers.id |
| points_balance | INTEGER | required, default | - |
| lifetime_points | INTEGER | required, default | - |
| tier | TEXT | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## loyalty_transactions

Source migrations: supabase/migrations/00027_loyalty_program.sql

RLS: enabled

Policies detected: 2

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| loyalty_account_id | UUID | FK, required | loyalty_accounts.id |
| order_id | UUID | FK | orders.id |
| points | INTEGER | required | - |
| type | TEXT | required | - |
| description | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |

## menu_categories

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00017_phase_b_security_rls_hardening.sql

RLS: enabled

Policies detected: 6

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| name | VARCHAR(100) | required | - |
| description | TEXT | - | - |
| sort_order | INTEGER | required, default | - |
| is_active | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## menu_item_availability

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00031_security_hardening.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| menu_item_id | UUID | FK, required | menu_items.id |
| day_of_week | INTEGER | required | - |
| start_time | TIME | - | - |
| end_time | TIME | - | - |
| is_available | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## menu_item_option_values

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00031_security_hardening.sql

RLS: enabled

Policies detected: 3

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| option_id | UUID | FK, required | menu_item_options.id |
| name | VARCHAR(100) | required | - |
| price_adjustment | DECIMAL(10, 2) | required, default | - |
| is_available | BOOLEAN | required, default | - |
| sort_order | INTEGER | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## menu_item_options

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 2

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| menu_item_id | UUID | FK, required | menu_items.id |
| name | VARCHAR(100) | required | - |
| is_required | BOOLEAN | required, default | - |
| max_selections | INTEGER | required, default | - |
| sort_order | INTEGER | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## menu_items

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00017_phase_b_security_rls_hardening.sql

RLS: enabled

Policies detected: 6

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| category_id | UUID | FK, required | menu_categories.id |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| name | VARCHAR(200) | required | - |
| description | TEXT | - | - |
| price | DECIMAL(10, 2) | required | - |
| image_url | TEXT | - | - |
| is_available | BOOLEAN | required, default | - |
| is_featured | BOOLEAN | required, default | - |
| dietary_tags | TEXT[] | default | - |
| prep_time_minutes | INTEGER | - | - |
| sort_order | INTEGER | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| is_sold_out | BOOLEAN | default | - |
| sold_out_at | TIMESTAMPTZ | - | - |
| restock_at | TIMESTAMPTZ | - | - |
| daily_limit | INTEGER | - | - |
| daily_sold | INTEGER | default | - |

## notifications

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00004_additions.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00011_rls_role_alignment.sql

RLS: enabled

Policies detected: 7

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| type | VARCHAR(50) | required | - |
| title | VARCHAR(255) | required | - |
| body | TEXT | required | - |
| data | JSONB | - | - |
| is_read | BOOLEAN | required, default | - |
| read_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| message | TEXT | - | - |

## ops_override_logs

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 1

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| action | VARCHAR(100) | required | - |
| entity_type | VARCHAR(50) | required | - |
| entity_id | UUID | required | - |
| before_state | JSONB | required | - |
| after_state | JSONB | required | - |
| reason | TEXT | required | - |
| actor_user_id | UUID | FK, required | auth.users.id |
| actor_role | VARCHAR(50) | required | - |
| approved_by | UUID | FK | auth.users.id |
| created_at | TIMESTAMPTZ | required, default | - |

## ops_processor_runs

Source migrations: supabase/migrations/00023_ops_processor_runs.sql

RLS: not detected

Policies detected: 0

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | uuid | PK, default | - |
| processor_name | text | required | - |
| idempotency_key | text | required | - |
| status | text | required | - |
| started_at | timestamptz | required, default | - |
| finished_at | timestamptz | - | - |
| result | jsonb | required, default | - |
| error_message | text | - | - |

## order_exceptions

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 2

Indexes detected: 4

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| exception_type | VARCHAR(100) | required | - |
| severity | VARCHAR(20) | required | - |
| status | VARCHAR(50) | required, default | - |
| order_id | UUID | FK | orders.id |
| customer_id | UUID | FK | customers.id |
| chef_id | UUID | FK | chef_profiles.id |
| driver_id | UUID | FK | drivers.id |
| delivery_id | UUID | FK | deliveries.id |
| title | VARCHAR(255) | required | - |
| description | TEXT | - | - |
| recommended_actions | JSONB | default | - |
| internal_notes | TEXT | - | - |
| resolution | TEXT | - | - |
| resolved_by | UUID | FK | auth.users.id |
| resolved_at | TIMESTAMPTZ | - | - |
| linked_refund_id | UUID | - | - |
| linked_payout_adjustment_id | UUID | - | - |
| sla_deadline | TIMESTAMPTZ | - | - |
| escalated_at | TIMESTAMPTZ | - | - |
| assigned_to | UUID | FK | platform_users.id |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## order_item_modifiers

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql

RLS: enabled

Policies detected: 0

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_item_id | UUID | FK, required | order_items.id |
| option_name | VARCHAR(100) | required | - |
| value_name | VARCHAR(100) | required | - |
| price_adjustment | DECIMAL(10, 2) | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |

## order_items

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00006_fix_order_items.sql, supabase/migrations/00010_contract_drift_repair.sql

RLS: enabled

Policies detected: 6

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK, required | orders.id |
| menu_item_id | UUID | FK, required | menu_items.id |
| menu_item_name | VARCHAR(200) | required | - |
| quantity | INTEGER | required | - |
| unit_price | DECIMAL(10, 2) | required | - |
| total_price | DECIMAL(10, 2) | required | - |
| special_instructions | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| selected_options | JSONB | default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| subtotal | DECIMAL(10 | - | - |

## order_status_history

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00004_additions.sql, supabase/migrations/00010_contract_drift_repair.sql

RLS: enabled

Policies detected: 0

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK, required | orders.id |
| status | VARCHAR(30) | required | - |
| notes | TEXT | - | - |
| changed_by | UUID | FK | auth.users.id |
| created_at | TIMESTAMPTZ | required, default | - |
| previous_status | VARCHAR(50) | - | - |
| new_status | VARCHAR(50) | - | - |

## orders

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00019_business_engine.sql, supabase/migrations/00031_security_hardening.sql, supabase/migrations/00040_scheduled_orders.sql, supabase/migrations/00041_engine_status_check.sql

RLS: enabled

Policies detected: 9

Indexes detected: 7

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_number | VARCHAR(20) | required, unique | - |
| customer_id | UUID | FK, required | customers.id |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| delivery_address_id | UUID | FK, required | customer_addresses.id |
| status | VARCHAR(30) | required, default | - |
| subtotal | DECIMAL(10, 2) | required | - |
| delivery_fee | DECIMAL(10, 2) | required, default | - |
| service_fee | DECIMAL(10, 2) | required, default | - |
| tax | DECIMAL(10, 2) | required, default | - |
| tip | DECIMAL(10, 2) | required, default | - |
| total | DECIMAL(10, 2) | required | - |
| payment_status | VARCHAR(20) | required, default | - |
| payment_intent_id | VARCHAR(255) | - | - |
| special_instructions | TEXT | - | - |
| estimated_ready_at | TIMESTAMPTZ | - | - |
| actual_ready_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| engine_status | VARCHAR(50) | default | - |
| rejection_reason | VARCHAR(100) | - | - |
| rejection_notes | TEXT | - | - |
| cancellation_reason | VARCHAR(100) | - | - |
| cancellation_notes | TEXT | - | - |
| cancelled_by | UUID | FK | auth.users.id |
| cancelled_at | TIMESTAMPTZ | - | - |
| estimated_prep_minutes | INTEGER | default | - |
| actual_prep_minutes | INTEGER | - | - |
| prep_started_at | TIMESTAMPTZ | - | - |
| ready_at | TIMESTAMPTZ | - | - |
| completed_at | TIMESTAMPTZ | - | - |
| exception_count | INTEGER | default | - |
| public_stage | TEXT | - | - |
| scheduled_for | TIMESTAMPTZ | - | - |

## payout_adjustments

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 1

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| payee_type | VARCHAR(20) | required | - |
| payee_id | UUID | required | - |
| order_id | UUID | FK | orders.id |
| refund_case_id | UUID | FK | refund_cases.id |
| adjustment_type | VARCHAR(50) | required | - |
| amount_cents | INTEGER | required | - |
| reason | TEXT | required | - |
| status | VARCHAR(20) | required, default | - |
| created_by | UUID | FK, required | auth.users.id |
| applied_to_payout_id | UUID | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## payout_runs

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00032_payout_concurrency_guard.sql

RLS: enabled

Policies detected: 0

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| run_type | VARCHAR(20) | required | - |
| status | VARCHAR(20) | required, default | - |
| period_start | TIMESTAMPTZ | required | - |
| period_end | TIMESTAMPTZ | required | - |
| total_amount | DECIMAL(10, 2) | required, default | - |
| total_recipients | INTEGER | required, default | - |
| successful_payouts | INTEGER | required, default | - |
| failed_payouts | INTEGER | required, default | - |
| initiated_by | UUID | FK, required | auth.users.id |
| completed_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## platform_accounts

Source migrations: supabase/migrations/00019_business_engine.sql

RLS: enabled

Policies detected: 1

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| account_type | TEXT | required | - |
| owner_id | UUID | required | - |
| balance_cents | BIGINT | required, default | - |
| pending_payout_cents | BIGINT | required, default | - |
| lifetime_earned_cents | BIGINT | required, default | - |
| currency | TEXT | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## platform_settings

Source migrations: supabase/migrations/00004_additions.sql, supabase/migrations/00009_ops_admin_control_plane.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00012_schema_drift_cleanup.sql, supabase/migrations/00024_canonical_consolidation.sql

RLS: enabled

Policies detected: 5

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| platform_fee_percent | DECIMAL(5 | - | - |
| service_fee_percent | DECIMAL(5 | - | - |
| hst_rate | DECIMAL(5 | - | - |
| min_order_amount | DECIMAL(10 | - | - |
| max_delivery_radius_km | DECIMAL(5 | - | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| dispatch_radius_km | DECIMAL(5 | - | - |
| max_delivery_distance_km | DECIMAL(5 | - | - |
| default_prep_time_minutes | INTEGER | default | - |
| offer_timeout_seconds | INTEGER | default | - |
| max_assignment_attempts | INTEGER | default | - |
| auto_assign_enabled | BOOLEAN | default | - |
| refund_auto_review_threshold_cents | INTEGER | default | - |
| support_sla_warning_minutes | INTEGER | default | - |
| support_sla_breach_minutes | INTEGER | default | - |
| storefront_throttle_order_limit | INTEGER | default | - |
| storefront_throttle_window_minutes | INTEGER | default | - |
| storefront_auto_pause_enabled | BOOLEAN | default | - |
| storefront_pause_on_sla_breach | BOOLEAN | default | - |
| updated_by | UUID | - | - |
| setting_key | VARCHAR(100) | - | - |
| setting_value | JSONB | default | - |
| description | TEXT | - | - |
| driver_payout_percent | DECIMAL(5 | - | - |
| base_delivery_fee_cents | INTEGER | default | - |
| chef_response_sla_minutes | INTEGER | default | - |
| dispatch_timeout_minutes | INTEGER | default | - |
| refund_window_hours | INTEGER | default | - |
| created_at | TIMESTAMPTZ | default | - |

## platform_users

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00015_phase2_platform_roles.sql

RLS: enabled

Policies detected: 1

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| email | VARCHAR(255) | required | - |
| name | VARCHAR(100) | required | - |
| role | VARCHAR(20) | required | - |
| is_active | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## promo_code_usages

Source migrations: supabase/migrations/00043_promo_customer_usage.sql

RLS: enabled

Policies detected: 2

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| promo_id | UUID | FK, required | promo_codes.id |
| customer_id | UUID | FK, required | customers.id |
| order_id | UUID | FK | orders.id |
| created_at | TIMESTAMPTZ | required, default | - |

## promo_codes

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00004_additions.sql, supabase/migrations/00010_contract_drift_repair.sql, supabase/migrations/00011_rls_role_alignment.sql, supabase/migrations/00012_schema_drift_cleanup.sql, supabase/migrations/00025_rls_role_alignment.sql, supabase/migrations/00036_drop_promo_alias_columns.sql

RLS: enabled

Policies detected: 4

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| code | TEXT | required, unique | - |
| description | TEXT | - | - |
| discount_type | TEXT | required | - |
| discount_value | DECIMAL(10, 2) | required | - |
| min_order_amount | DECIMAL(10, 2) | default | - |
| max_discount | DECIMAL(10, 2) | - | - |
| usage_limit | INTEGER | - | - |
| usage_count | INTEGER | required, default | - |
| starts_at | TIMESTAMPTZ | - | - |
| expires_at | TIMESTAMPTZ | default | - |
| is_active | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |
| used_count | INTEGER | required, default | - |

## push_subscriptions

Source migrations: supabase/migrations/00004_additions.sql, supabase/migrations/00033_push_subscriptions_restore.sql

RLS: enabled

Policies detected: 5

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| endpoint | TEXT | required | - |
| p256dh | TEXT | required | - |
| auth | TEXT | required | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## referral_codes

Source migrations: supabase/migrations/00028_referral_system.sql

RLS: enabled

Policies detected: 2

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| user_id | UUID | FK, required | auth.users.id |
| user_type | TEXT | required | - |
| code | TEXT | required, unique | - |
| uses_count | INTEGER | required, default | - |
| max_uses | INTEGER | - | - |
| reward_cents | INTEGER | required, default | - |
| is_active | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |

## referral_signups

Source migrations: supabase/migrations/00028_referral_system.sql

RLS: enabled

Policies detected: 2

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| referral_code_id | UUID | FK, required | referral_codes.id |
| referred_user_id | UUID | FK, required | auth.users.id |
| referred_user_type | TEXT | required | - |
| status | TEXT | required, default | - |
| first_order_id | UUID | FK | orders.id |
| reward_paid | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |

## refund_cases

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 1

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK, required | orders.id |
| exception_id | UUID | FK | order_exceptions.id |
| requested_by | UUID | FK, required | auth.users.id |
| requested_amount_cents | INTEGER | required | - |
| approved_amount_cents | INTEGER | - | - |
| refund_reason | VARCHAR(50) | required | - |
| refund_notes | TEXT | - | - |
| status | VARCHAR(20) | required, default | - |
| reviewed_by | UUID | FK | auth.users.id |
| reviewed_at | TIMESTAMPTZ | - | - |
| stripe_refund_id | VARCHAR(255) | - | - |
| processed_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## reviews

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00002_rls_policies.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00017_phase_b_security_rls_hardening.sql

RLS: enabled

Policies detected: 7

Indexes detected: 1

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK, required | orders.id |
| customer_id | UUID | FK, required | customers.id |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| rating | INTEGER | required | - |
| comment | TEXT | - | - |
| chef_response | TEXT | - | - |
| chef_responded_at | TIMESTAMPTZ | - | - |
| is_visible | BOOLEAN | required, default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## service_areas

Source migrations: supabase/migrations/00019_business_engine.sql

RLS: enabled

Policies detected: 2

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| name | TEXT | required | - |
| polygon | GEOGRAPHY (POLYGON, 4326) | required | - |
| is_active | BOOLEAN | required, default | - |
| surge_multiplier | NUMERIC(6, 3) | required, default | - |
| dispatch_radius_km | NUMERIC(8, 3) | - | - |
| offer_ttl_seconds | INTEGER | - | - |
| max_offer_attempts | INTEGER | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## sla_timers

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 1

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| sla_type | VARCHAR(50) | required | - |
| status | VARCHAR(20) | required, default | - |
| entity_type | VARCHAR(50) | required | - |
| entity_id | UUID | required | - |
| started_at | TIMESTAMPTZ | required, default | - |
| warning_at | TIMESTAMPTZ | - | - |
| deadline_at | TIMESTAMPTZ | required | - |
| completed_at | TIMESTAMPTZ | - | - |
| breached_at | TIMESTAMPTZ | - | - |
| metadata | JSONB | default | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## storefront_state_changes

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 2

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| storefront_id | UUID | FK, required | chef_storefronts.id |
| previous_state | VARCHAR(50) | - | - |
| new_state | VARCHAR(50) | required | - |
| reason | TEXT | - | - |
| changed_by | UUID | FK | auth.users.id |
| changed_by_role | VARCHAR(50) | - | - |
| metadata | JSONB | default | - |
| created_at | TIMESTAMPTZ | required, default | - |

## stripe_events_processed

Source migrations: supabase/migrations/00016_phase3_stripe_idempotency_order_events_promo.sql, supabase/migrations/00021_finance_hardening.sql, supabase/migrations/00037_stripe_events_processed_schema_fix.sql

RLS: enabled

Policies detected: 0

Indexes detected: 4

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| stripe_event_id | TEXT | required | - |
| event_type | TEXT | required | - |
| livemode | BOOLEAN | required, default | - |
| processed_at | TIMESTAMPTZ | required, default | - |
| processing_status | TEXT | required, default | - |
| related_order_id | UUID | FK | orders.id |
| related_payment_id | UUID | - | - |
| payload_hash | TEXT | - | - |
| error_message | TEXT | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| stripe_amount_cents | BIGINT | - | - |

## stripe_reconciliation

Source migrations: supabase/migrations/00019_business_engine.sql, supabase/migrations/00021_finance_hardening.sql

RLS: enabled

Policies detected: 3

Indexes detected: 2

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| stripe_event_id | TEXT | FK, required | stripe_events_processed.stripe_event_id |
| ledger_entry_ids | UUID[] | required, default | - |
| status | TEXT | required, default | - |
| variance_cents | BIGINT | required, default | - |
| notes | TEXT | - | - |
| resolved_by | UUID | FK | platform_users.id |
| resolved_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| variance_flagged | BOOLEAN | required, default | - |

## support_tickets

Source migrations: supabase/migrations/00001_initial_schema.sql, supabase/migrations/00003_fix_rls.sql, supabase/migrations/00005_anon_read_policies.sql, supabase/migrations/00017_phase_b_security_rls_hardening.sql, supabase/migrations/00025_rls_role_alignment.sql

RLS: enabled

Policies detected: 9

Indexes detected: 0

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| order_id | UUID | FK | orders.id |
| customer_id | UUID | FK | customers.id |
| chef_id | UUID | FK | chef_profiles.id |
| driver_id | UUID | - | - |
| subject | VARCHAR(255) | required | - |
| description | TEXT | required | - |
| status | VARCHAR(20) | required, default | - |
| priority | VARCHAR(20) | required, default | - |
| assigned_to | UUID | FK | auth.users.id |
| resolved_at | TIMESTAMPTZ | - | - |
| created_at | TIMESTAMPTZ | required, default | - |
| updated_at | TIMESTAMPTZ | required, default | - |

## system_alerts

Source migrations: supabase/migrations/00007_central_engine_tables.sql

RLS: enabled

Policies detected: 1

Indexes detected: 3

| Column | Type | Flags | References |
| --- | --- | --- | --- |
| id | UUID | PK, default | - |
| alert_type | VARCHAR(50) | required | - |
| severity | VARCHAR(20) | required | - |
| title | VARCHAR(255) | required | - |
| message | TEXT | - | - |
| entity_type | VARCHAR(50) | - | - |
| entity_id | UUID | - | - |
| acknowledged | BOOLEAN | required, default | - |
| acknowledged_by | UUID | FK | auth.users.id |
| acknowledged_at | TIMESTAMPTZ | - | - |
| auto_resolved | BOOLEAN | required, default | - |
| resolved_at | TIMESTAMPTZ | - | - |
| metadata | JSONB | default | - |
| created_at | TIMESTAMPTZ | required, default | - |
