# Supabase App Usage Matrix

This matrix maps application code and shared packages to Supabase tables, RPCs, and storage buckets using static scans of `.from(...)`, `.rpc(...)`, and `storage.from(...)`.

## Table Usage

| Schema Status | Table/Bucket Name | Surfaces | Operations | Reference Count | Example File |
| --- | --- | --- | --- | --- | --- |
| DEFINED | admin_notes | Shared Packages | insert, select | 3 | packages/db/src/repositories/ops.repository.ts |
| DEFINED | analytics_events | Ops Admin, Shared Packages | insert, select | 2 | apps/ops-admin/src/app/dashboard/analytics/components/event-metrics.tsx |
| DEFINED | assignment_attempts | Driver App, Ops Admin, Shared Packages | insert, select, update | 24 | apps/driver-app/src/app/api/deliveries/[id]/route.ts |
| DEFINED | audit_logs | Ops Admin, Shared Packages | insert, select | 6 | apps/ops-admin/src/app/api/audit/recent/route.ts |
| DEFINED | cart_items | Customer Web, Shared Packages | delete, insert, select, update | 7 | apps/web/src/app/api/cart/route.ts |
| DEFINED | carts | Shared Packages | insert, select | 3 | packages/db/src/repositories/cart.repository.ts |
| DEFINED | checkout_idempotency_keys | Customer Web | insert, select, update | 5 | apps/web/src/app/api/checkout/route.ts |
| DEFINED | chef_availability | Chef Admin, Shared Packages | delete, insert, select | 5 | apps/chef-admin/src/app/api/storefront/availability/route.ts |
| DEFINED | chef_delivery_zones | Ops Admin | select | 1 | apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx |
| DEFINED | chef_documents | - | - | 0 | - |
| DEFINED | chef_kitchens | Chef Admin, Customer Web, Shared Packages | insert, select | 5 | apps/chef-admin/src/app/api/storefront/route.ts |
| DEFINED | chef_payout_accounts | Chef Admin, Ops Admin, Shared Packages | insert, select | 6 | apps/chef-admin/src/app/api/payouts/setup/route.ts |
| DEFINED | chef_payouts | Chef Admin, Ops Admin, Shared Packages | insert, select, update | 9 | apps/chef-admin/src/app/dashboard/payouts/page.tsx |
| DEFINED | chef_profiles | Chef Admin, Ops Admin, Shared Packages | insert, select, update | 41 | apps/chef-admin/src/app/api/health/route.ts |
| DEFINED | chef_storefronts | Chef Admin, Customer Web, Ops Admin, Shared Packages | insert, select, update | 55 | apps/chef-admin/src/app/api/storefront/route.ts |
| DEFINED | customer_addresses | Chef Admin, Customer Web, Shared Packages | delete, insert, select, update | 20 | apps/chef-admin/src/app/api/orders/route.ts |
| DEFINED | customers | Chef Admin, Customer Web, Ops Admin, Shared Packages | insert, select, update, upsert | 29 | apps/chef-admin/src/app/api/orders/route.ts |
| DEFINED | deliveries | Driver App, Ops Admin, Shared Packages | insert, select, update | 76 | apps/driver-app/src/app/api/deliveries/[id]/route.ts |
| DEFINED | delivery_assignments | - | - | 0 | - |
| DEFINED | delivery_events | Shared Packages | insert, select | 4 | packages/db/src/repositories/ops.repository.ts |
| DEFINED | delivery_tracking_events | Driver App, Shared Packages | insert, select | 4 | apps/driver-app/src/app/api/location/route.ts |
| DEFINED | domain_events | Shared Packages | insert, update | 2 | packages/engine/src/core/event-emitter.ts |
| DEFINED | driver_documents | - | - | 0 | - |
| DEFINED | driver_earnings | - | - | 0 | - |
| DEFINED | driver_locations | Driver App | insert | 1 | apps/driver-app/src/app/api/location/route.ts |
| DEFINED | driver_payout_accounts | Driver App | insert, select | 4 | apps/driver-app/src/app/api/payouts/setup/route.ts |
| DEFINED | driver_payouts | Ops Admin, Shared Packages | insert, select, update | 4 | apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx |
| DEFINED | driver_presence | Driver App, Ops Admin, Shared Packages | insert, select, update, upsert | 25 | apps/driver-app/src/app/api/auth/signup/route.ts |
| REFERENCED_ONLY | driver_profiles | Shared Packages | select | 2 | packages/engine/src/core/business-rules-engine.ts |
| DEFINED | driver_shifts | - | - | 0 | - |
| DEFINED | driver_vehicles | - | - | 0 | - |
| DEFINED | drivers | Driver App, Ops Admin, Shared Packages | insert, select, update | 42 | apps/driver-app/src/app/api/driver/route.ts |
| DEFINED | favorites | Customer Web | delete, insert, select | 4 | apps/web/src/app/api/favorites/route.ts |
| DEFINED | instant_payout_requests | Ops Admin, Shared Packages | insert, select, update | 14 | apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts |
| DEFINED | kitchen_queue_entries | Shared Packages | insert, select, update | 6 | packages/engine/src/e2e/order-lifecycle.e2e.ts |
| DEFINED | ledger_entries | Ops Admin, Shared Packages | insert, select | 37 | apps/ops-admin/src/app/api/analytics/trends/route.ts |
| DEFINED | loyalty_accounts | Shared Packages | insert, select | 4 | packages/engine/src/services/loyalty.service.ts |
| DEFINED | loyalty_transactions | Customer Web, Shared Packages | insert, select | 3 | apps/web/src/app/api/loyalty/route.ts |
| DEFINED | menu_categories | Shared Packages | insert, select | 2 | packages/db/src/repositories/menu.repository.ts |
| DEFINED | menu_item_availability | - | - | 0 | - |
| DEFINED | menu_item_option_values | - | - | 0 | - |
| DEFINED | menu_item_options | - | - | 0 | - |
| DEFINED | menu_items | Customer Web, Shared Packages | delete, insert, select, update | 21 | apps/web/src/app/api/cart/route.ts |
| DEFINED | notifications | Customer Web, Ops Admin, Shared Packages | insert, select, update | 16 | apps/ops-admin/src/app/api/announcements/route.ts |
| DEFINED | ops_override_logs | Ops Admin, Shared Packages | insert, select | 2 | apps/ops-admin/src/app/dashboard/activity/page.tsx |
| DEFINED | ops_processor_runs | Ops Admin | insert, update | 2 | apps/ops-admin/src/lib/processor-runs.ts |
| DEFINED | order_exceptions | Ops Admin, Shared Packages | insert, select, update | 22 | apps/ops-admin/src/app/api/engine/orders/[id]/route.ts |
| DEFINED | order_item_modifiers | - | - | 0 | - |
| DEFINED | order_items | Chef Admin, Shared Packages | insert, select | 7 | apps/chef-admin/src/app/api/analytics/route.ts |
| DEFINED | order_status_history | Customer Web, Shared Packages | insert, select | 6 | apps/web/src/app/api/orders/[id]/route.ts |
| DEFINED | orders | Chef Admin, Customer Web, Driver App, Ops Admin, Shared Packages | delete, insert, select, update | 106 | apps/chef-admin/src/app/api/analytics/route.ts |
| DEFINED | payout_adjustments | Shared Packages | insert, select, update | 5 | packages/db/src/repositories/finance.repository.ts |
| DEFINED | payout_runs | Ops Admin, Shared Packages | insert, select, update | 6 | apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx |
| DEFINED | platform_accounts | Driver App, Ops Admin, Shared Packages | select | 11 | apps/driver-app/src/app/earnings/page.tsx |
| DEFINED | platform_settings | Ops Admin, Shared Packages | select, update | 11 | apps/ops-admin/src/app/api/engine/maintenance/route.ts |
| DEFINED | platform_users | Driver App, Ops Admin, Shared Packages | insert, select, update, upsert | 10 | apps/driver-app/src/lib/platform-access.ts |
| DEFINED | promo_codes | Customer Web, Ops Admin, Shared Packages | delete, insert, select, update | 10 | apps/ops-admin/src/app/api/promos/route.ts |
| DEFINED | push_subscriptions | Customer Web | delete, upsert | 2 | apps/web/src/app/api/notifications/subscribe/route.ts |
| DEFINED | referral_codes | Shared Packages | insert, select | 4 | packages/engine/src/services/referral.service.ts |
| DEFINED | referral_signups | Shared Packages | insert, select, update | 3 | packages/engine/src/services/referral.service.ts |
| DEFINED | refund_cases | Shared Packages | insert, select, update | 10 | packages/db/src/repositories/finance.repository.ts |
| DEFINED | reviews | Chef Admin, Customer Web, Ops Admin | insert, select, update | 8 | apps/chef-admin/src/app/api/analytics/route.ts |
| DEFINED | service_areas | Customer Web, Ops Admin, Shared Packages | select, update | 5 | apps/ops-admin/src/app/api/surge/route.ts |
| DEFINED | sla_timers | Shared Packages | insert, select, update | 13 | packages/engine/src/core/health-checks.ts |
| DEFINED | storefront_state_changes | Ops Admin, Shared Packages | insert, select | 4 | apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts |
| DEFINED | stripe_events_processed | Ops Admin, Shared Packages | insert, select, update | 7 | apps/ops-admin/src/app/api/export/route.ts |
| DEFINED | stripe_reconciliation | Ops Admin, Shared Packages | select, update, upsert | 5 | apps/ops-admin/src/app/api/engine/reconciliation/route.ts |
| DEFINED | support_tickets | Shared Packages | insert, select, update | 11 | packages/db/src/repositories/ops.repository.ts |
| DEFINED | system_alerts | Ops Admin, Shared Packages | insert, select, update | 12 | apps/ops-admin/src/app/api/engine/dashboard/route.ts |

## Referenced Names Missing From Migrations

| Name | Surfaces | Example File | Review Note |
| --- | --- | --- | --- |
| driver_profiles | Shared Packages | packages/engine/src/core/business-rules-engine.ts | Code references this name but migrations do not create it. Confirm table, view, storage bucket, or typo. |

## RPC Usage

| Schema Status | RPC Function | Surfaces | Example File | Migration Source |
| --- | --- | --- | --- | --- |
| DEFINED | decrement_queue_size | - | - | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | get_available_drivers_near | - | - | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | get_chef_id | - | - | supabase/migrations/00003_fix_rls.sql |
| DEFINED | get_customer_id | - | - | supabase/migrations/00003_fix_rls.sql |
| DEFINED | get_driver_id | - | - | supabase/migrations/00003_fix_rls.sql |
| DEFINED | get_financial_summary | - | - | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | get_ops_dashboard_stats | Ops Admin, Shared Packages | apps/ops-admin/src/app/api/engine/dashboard/route.ts | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | get_order_timeline | - | - | supabase/migrations/00008_engine_rpc_functions.sql, supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | get_orders_needing_dispatch | - | - | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | increment_order_exception_count | Shared Packages | packages/engine/src/orchestrators/support.engine.ts | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | increment_promo_usage | Customer Web, Shared Packages | apps/web/src/app/api/checkout/route.ts | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | increment_queue_size | - | - | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | is_finance_staff | - | - | supabase/migrations/00025_rls_role_alignment.sql |
| DEFINED | is_ops_admin | - | - | supabase/migrations/00003_fix_rls.sql |
| DEFINED | is_platform_staff | - | - | supabase/migrations/00025_rls_role_alignment.sql |
| DEFINED | is_support_staff | - | - | supabase/migrations/00025_rls_role_alignment.sql |
| DEFINED | ledger_entries_touch_platform_accounts | - | - | supabase/migrations/00019_business_engine.sql |
| DEFINED | log_audit_change | - | - | supabase/migrations/00007_central_engine_tables.sql, supabase/migrations/00014_fix_audit_trigger.sql |
| DEFINED | orders_public_stage_from_engine | - | - | supabase/migrations/00019_business_engine.sql |
| DEFINED | orders_sync_public_stage_from_engine | - | - | supabase/migrations/00019_business_engine.sql |
| DEFINED | populate_order_item_name | - | - | supabase/migrations/00006_fix_order_items.sql |
| DEFINED | public.get_ops_dashboard_stats | Ops Admin, Shared Packages | apps/ops-admin/src/app/api/engine/dashboard/route.ts | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | public.increment_order_exception_count | Shared Packages | packages/engine/src/orchestrators/support.engine.ts | supabase/migrations/00008_engine_rpc_functions.sql |
| DEFINED | public.increment_promo_usage | Customer Web, Shared Packages | apps/web/src/app/api/checkout/route.ts | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | sync_driver_presence_location | - | - | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | sync_kitchen_address | - | - | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | sync_notification_body | - | - | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | sync_order_status_history | - | - | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | sync_promo_code_fields | - | - | supabase/migrations/00010_contract_drift_repair.sql |
| DEFINED | update_loyalty_account_updated_at | - | - | supabase/migrations/00027_loyalty_program.sql |
| DEFINED | update_updated_at_column | - | - | supabase/migrations/00001_initial_schema.sql |

## Storage Bucket Usage

| Bucket | Surfaces | Reference Count | Example File |
| --- | --- | --- | --- |
| None | None | None | None |
