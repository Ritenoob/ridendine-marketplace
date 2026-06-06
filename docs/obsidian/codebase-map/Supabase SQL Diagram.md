# Supabase SQL Diagram

Source of truth: [[Every Page Document]], Supabase migrations, and app/package Supabase calls.

## System

```mermaid
flowchart LR
  Web["Customer Web\nridendine.ca"]:::app
  Chef["Chef Admin\nchef.ridendine.ca"]:::chef
  Driver["Driver App\ndriver.ridendine.ca"]:::driver
  Ops["Ops Admin\nops.ridendine.ca"]:::ops
  API["Next.js API Routes\nserver-side Supabase clients"]:::api
  Packages["@ridendine/db + @ridendine/engine\nrepositories and orchestration"]:::pkg
  Auth["Supabase Auth\nauth.users"]:::auth
  Public["Supabase public schema\napplication tables, RLS, RPC"]:::db
  Storage["Supabase Storage\nchef/customer/driver assets"]:::storage
  Stripe["Stripe\ncheckout, webhooks, payouts"]:::external
  Web --> API
  Chef --> API
  Driver --> API
  Ops --> API
  API --> Packages
  API --> Auth
  Packages --> Public
  API --> Public
  API --> Storage
  API --> Stripe
  Stripe --> Public
  classDef app fill:#dbeafe,stroke:#2563eb,color:#0f172a
  classDef chef fill:#ffedd5,stroke:#ea580c,color:#0f172a
  classDef driver fill:#dcfce7,stroke:#16a34a,color:#0f172a
  classDef ops fill:#ede9fe,stroke:#7c3aed,color:#0f172a
  classDef api fill:#f1f5f9,stroke:#475569,color:#0f172a
  classDef pkg fill:#fef9c3,stroke:#ca8a04,color:#0f172a
  classDef auth fill:#cffafe,stroke:#0891b2,color:#0f172a
  classDef db fill:#e0f2fe,stroke:#0284c7,color:#0f172a
  classDef storage fill:#ecfccb,stroke:#65a30d,color:#0f172a
  classDef external fill:#fee2e2,stroke:#dc2626,color:#0f172a
```

## App Wiring

```mermaid
flowchart LR
  CustomerWeb["Customer Web"]:::surface
  table_customers["customers"]:::table
  CustomerWeb --> table_customers
  table_customer_addresses["customer_addresses"]:::table
  CustomerWeb --> table_customer_addresses
  table_cart_items["cart_items"]:::table
  CustomerWeb --> table_cart_items
  table_favorites["favorites"]:::table
  CustomerWeb --> table_favorites
  table_orders["orders"]:::table
  CustomerWeb --> table_orders
  table_reviews["reviews"]:::table
  CustomerWeb --> table_reviews
  table_notifications["notifications"]:::table
  CustomerWeb --> table_notifications
  table_loyalty_transactions["loyalty_transactions"]:::table
  CustomerWeb --> table_loyalty_transactions
  ChefAdmin["Chef Admin"]:::surface
  table_chef_profiles["chef_profiles"]:::table
  ChefAdmin --> table_chef_profiles
  table_chef_storefronts["chef_storefronts"]:::table
  ChefAdmin --> table_chef_storefronts
  table_chef_kitchens["chef_kitchens"]:::table
  ChefAdmin --> table_chef_kitchens
  table_chef_availability["chef_availability"]:::table
  ChefAdmin --> table_chef_availability
  table_menu_items["menu_items"]:::table
  ChefAdmin --> table_menu_items
  table_orders["orders"]:::table
  ChefAdmin --> table_orders
  table_order_items["order_items"]:::table
  ChefAdmin --> table_order_items
  table_reviews["reviews"]:::table
  ChefAdmin --> table_reviews
  table_chef_payout_accounts["chef_payout_accounts"]:::table
  ChefAdmin --> table_chef_payout_accounts
  DriverApp["Driver App"]:::surface
  table_drivers["drivers"]:::table
  DriverApp --> table_drivers
  table_driver_presence["driver_presence"]:::table
  DriverApp --> table_driver_presence
  table_driver_locations["driver_locations"]:::table
  DriverApp --> table_driver_locations
  table_deliveries["deliveries"]:::table
  DriverApp --> table_deliveries
  table_assignment_attempts["assignment_attempts"]:::table
  DriverApp --> table_assignment_attempts
  table_delivery_tracking_events["delivery_tracking_events"]:::table
  DriverApp --> table_delivery_tracking_events
  table_driver_payout_accounts["driver_payout_accounts"]:::table
  DriverApp --> table_driver_payout_accounts
  OpsAdmin["Ops Admin"]:::surface
  table_platform_users["platform_users"]:::table
  OpsAdmin --> table_platform_users
  table_orders["orders"]:::table
  OpsAdmin --> table_orders
  table_deliveries["deliveries"]:::table
  OpsAdmin --> table_deliveries
  table_drivers["drivers"]:::table
  OpsAdmin --> table_drivers
  table_chef_profiles["chef_profiles"]:::table
  OpsAdmin --> table_chef_profiles
  table_customers["customers"]:::table
  OpsAdmin --> table_customers
  table_ledger_entries["ledger_entries"]:::table
  OpsAdmin --> table_ledger_entries
  table_payout_runs["payout_runs"]:::table
  OpsAdmin --> table_payout_runs
  table_stripe_reconciliation["stripe_reconciliation"]:::table
  OpsAdmin --> table_stripe_reconciliation
  table_support_tickets["support_tickets"]:::table
  OpsAdmin --> table_support_tickets
  table_audit_logs["audit_logs"]:::table
  OpsAdmin --> table_audit_logs
  SharedPackages["Shared Packages"]:::surface
  table_orders["orders"]:::table
  SharedPackages --> table_orders
  table_deliveries["deliveries"]:::table
  SharedPackages --> table_deliveries
  table_ledger_entries["ledger_entries"]:::table
  SharedPackages --> table_ledger_entries
  table_assignment_attempts["assignment_attempts"]:::table
  SharedPackages --> table_assignment_attempts
  table_order_exceptions["order_exceptions"]:::table
  SharedPackages --> table_order_exceptions
  table_system_alerts["system_alerts"]:::table
  SharedPackages --> table_system_alerts
  table_support_tickets["support_tickets"]:::table
  SharedPackages --> table_support_tickets
  table_platform_settings["platform_settings"]:::table
  SharedPackages --> table_platform_settings
  classDef surface fill:#f8fafc,stroke:#475569,color:#0f172a
  classDef table fill:#e0f2fe,stroke:#0284c7,color:#0f172a
```

## ERD Groups

### Identity and Roles

```mermaid
erDiagram
  customers {
    uuid id PK
    uuid user_id FK
    varchar first_name
    varchar last_name
    varchar phone
    varchar email
    text profile_image_url
    timestamptz created_at
    timestamptz updated_at
  }
  chef_profiles {
    uuid id PK
    uuid user_id FK
    varchar display_name
    text bio
    text profile_image_url
    varchar phone
    varchar status
    timestamptz created_at
    timestamptz updated_at
  }
  drivers {
    uuid id PK
    uuid user_id FK
    varchar first_name
    varchar last_name
    varchar phone
    varchar email
    text profile_image_url
    varchar status
    timestamptz created_at
    timestamptz updated_at
    decimal_3 rating
    integer total_deliveries
    varchar vehicle_type
    text vehicle_description
  }
  platform_users {
    uuid id PK
    uuid user_id FK
    varchar email
    varchar name
    varchar role
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }
  notifications {
    uuid id PK
    uuid user_id FK
    varchar type
    varchar title
    text body
    jsonb data
    boolean is_read
    timestamptz read_at
    timestamptz created_at
    text message
  }
  push_subscriptions {
    uuid id PK
    uuid user_id FK
    text endpoint
    text p256dh
    text auth
    timestamptz created_at
    timestamptz updated_at
  }
  auth_users ||--o{ chef_profiles : "user_id"
  auth_users ||--o{ customers : "user_id"
  auth_users ||--o{ drivers : "user_id"
  auth_users ||--o{ notifications : "user_id"
  auth_users ||--o{ platform_users : "user_id"
  auth_users ||--o{ push_subscriptions : "user_id"
```

### Chef, Storefront, and Menu

```mermaid
erDiagram
  chef_profiles {
    uuid id PK
    uuid user_id FK
    varchar display_name
    text bio
    text profile_image_url
    varchar phone
    varchar status
    timestamptz created_at
    timestamptz updated_at
  }
  chef_kitchens {
    uuid id PK
    uuid chef_id FK
    varchar name
    varchar address_line1
    varchar address_line2
    varchar city
    varchar state
    varchar postal_code
    varchar country
    decimal lat
    decimal lng
    boolean is_verified
    timestamptz created_at
    timestamptz updated_at
  }
  chef_storefronts {
    uuid id PK
    uuid chef_id FK
    uuid kitchen_id FK
    varchar slug
    varchar name
    text description
    text cuisine_types
    text cover_image_url
    text logo_url
    boolean is_active
    boolean is_featured
    decimal average_rating
    integer total_reviews
    decimal min_order_amount
  }
  chef_documents {
    uuid id PK
    uuid chef_id FK
    varchar document_type
    text document_url
    varchar status
    timestamptz expires_at
    text notes
    uuid reviewed_by FK
    timestamptz reviewed_at
    timestamptz created_at
    timestamptz updated_at
  }
  chef_availability {
    uuid id PK
    uuid storefront_id FK
    integer day_of_week
    time start_time
    time end_time
    boolean is_available
    timestamptz created_at
    timestamptz updated_at
  }
  chef_delivery_zones {
    uuid id PK
    uuid storefront_id FK
    varchar name
    decimal radius_km
    geometry polygon
    decimal delivery_fee
    decimal min_order_for_free_delivery
    integer estimated_delivery_min
    integer estimated_delivery_max
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }
  menu_categories {
    uuid id PK
    uuid storefront_id FK
    varchar name
    text description
    integer sort_order
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }
  menu_items {
    uuid id PK
    uuid category_id FK
    uuid storefront_id FK
    varchar name
    text description
    decimal price
    text image_url
    boolean is_available
    boolean is_featured
    text dietary_tags
    integer prep_time_minutes
    integer sort_order
    timestamptz created_at
    timestamptz updated_at
  }
  menu_item_options {
    uuid id PK
    uuid menu_item_id FK
    varchar name
    boolean is_required
    integer max_selections
    integer sort_order
    timestamptz created_at
    timestamptz updated_at
  }
  menu_item_option_values {
    uuid id PK
    uuid option_id FK
    varchar name
    decimal price_adjustment
    boolean is_available
    integer sort_order
    timestamptz created_at
    timestamptz updated_at
  }
  menu_item_availability {
    uuid id PK
    uuid menu_item_id FK
    integer day_of_week
    time start_time
    time end_time
    boolean is_available
    timestamptz created_at
    timestamptz updated_at
  }
  storefront_state_changes {
    uuid id PK
    uuid storefront_id FK
    varchar previous_state
    varchar new_state
    text reason
    uuid changed_by FK
    varchar changed_by_role
    jsonb metadata
    timestamptz created_at
  }
  chef_storefronts ||--o{ chef_availability : "storefront_id"
  chef_storefronts ||--o{ chef_delivery_zones : "storefront_id"
  chef_profiles ||--o{ chef_documents : "chef_id"
  auth_users ||--o{ chef_documents : "reviewed_by"
  chef_profiles ||--o{ chef_kitchens : "chef_id"
  auth_users ||--o{ chef_profiles : "user_id"
  chef_profiles ||--o{ chef_storefronts : "chef_id"
  chef_kitchens ||--o{ chef_storefronts : "kitchen_id"
  auth_users ||--o{ chef_storefronts : "paused_by"
  chef_storefronts ||--o{ menu_categories : "storefront_id"
  menu_items ||--o{ menu_item_availability : "menu_item_id"
  menu_item_options ||--o{ menu_item_option_values : "option_id"
  menu_items ||--o{ menu_item_options : "menu_item_id"
  menu_categories ||--o{ menu_items : "category_id"
  chef_storefronts ||--o{ menu_items : "storefront_id"
  auth_users ||--o{ storefront_state_changes : "changed_by"
  chef_storefronts ||--o{ storefront_state_changes : "storefront_id"
```

### Customer, Cart, Orders, and Reviews

```mermaid
erDiagram
  customers {
    uuid id PK
    uuid user_id FK
    varchar first_name
    varchar last_name
    varchar phone
    varchar email
    text profile_image_url
    timestamptz created_at
    timestamptz updated_at
  }
  customer_addresses {
    uuid id PK
    uuid customer_id FK
    varchar label
    varchar city
    varchar state
    varchar postal_code
    varchar country
    decimal lat
    decimal lng
    text delivery_instructions
    boolean is_default
    timestamptz created_at
    timestamptz updated_at
    varchar street_address
  }
  carts {
    uuid id PK
    uuid customer_id FK
    uuid storefront_id FK
    timestamptz created_at
    timestamptz updated_at
  }
  cart_items {
    uuid id PK
    uuid cart_id FK
    uuid menu_item_id FK
    integer quantity
    decimal unit_price
    text special_instructions
    jsonb selected_options
    timestamptz created_at
    timestamptz updated_at
  }
  favorites {
    uuid id PK
    uuid customer_id FK
    uuid storefront_id FK
    timestamptz created_at
  }
  orders {
    uuid id PK
    varchar order_number
    uuid customer_id FK
    uuid storefront_id FK
    uuid delivery_address_id FK
    varchar status
    decimal subtotal
    decimal delivery_fee
    decimal service_fee
    decimal tax
    decimal tip
    decimal total
    varchar payment_status
    varchar payment_intent_id
  }
  order_items {
    uuid id PK
    uuid order_id FK
    uuid menu_item_id FK
    varchar menu_item_name
    integer quantity
    decimal unit_price
    decimal total_price
    text special_instructions
    timestamptz created_at
    jsonb selected_options
    timestamptz updated_at
    decimal_10 subtotal
  }
  order_item_modifiers {
    uuid id PK
    uuid order_item_id FK
    varchar option_name
    varchar value_name
    decimal price_adjustment
    timestamptz created_at
  }
  order_status_history {
    uuid id PK
    uuid order_id FK
    varchar status
    text notes
    uuid changed_by FK
    timestamptz created_at
    varchar previous_status
    varchar new_status
  }
  reviews {
    uuid id PK
    uuid order_id FK
    uuid customer_id FK
    uuid storefront_id FK
    integer rating
    text comment
    text chef_response
    timestamptz chef_responded_at
    boolean is_visible
    timestamptz created_at
    timestamptz updated_at
  }
  checkout_idempotency_keys {
    uuid id PK
    uuid customer_id FK
    varchar idempotency_key
    varchar request_hash
    varchar status
    uuid order_id FK
    varchar payment_intent_id
    jsonb response_payload
    text last_error
    timestamptz created_at
    timestamptz updated_at
  }
  carts ||--o{ cart_items : "cart_id"
  customers ||--o{ carts : "customer_id"
  customers ||--o{ checkout_idempotency_keys : "customer_id"
  orders ||--o{ checkout_idempotency_keys : "order_id"
  customers ||--o{ customer_addresses : "customer_id"
  auth_users ||--o{ customers : "user_id"
  customers ||--o{ favorites : "customer_id"
  order_items ||--o{ order_item_modifiers : "order_item_id"
  orders ||--o{ order_items : "order_id"
  auth_users ||--o{ order_status_history : "changed_by"
  orders ||--o{ order_status_history : "order_id"
  auth_users ||--o{ orders : "cancelled_by"
  customers ||--o{ orders : "customer_id"
  customer_addresses ||--o{ orders : "delivery_address_id"
  customers ||--o{ reviews : "customer_id"
  orders ||--o{ reviews : "order_id"
```

### Driver and Delivery

```mermaid
erDiagram
  drivers {
    uuid id PK
    uuid user_id FK
    varchar first_name
    varchar last_name
    varchar phone
    varchar email
    text profile_image_url
    varchar status
    timestamptz created_at
    timestamptz updated_at
    decimal_3 rating
    integer total_deliveries
    varchar vehicle_type
    text vehicle_description
  }
  driver_documents {
    uuid id PK
    uuid driver_id FK
    varchar document_type
    text document_url
    varchar status
    timestamptz expires_at
    text notes
    uuid reviewed_by FK
    timestamptz reviewed_at
    timestamptz created_at
    timestamptz updated_at
  }
  driver_vehicles {
    uuid id PK
    uuid driver_id FK
    varchar vehicle_type
    varchar make
    varchar model
    integer year
    varchar color
    varchar license_plate
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }
  driver_shifts {
    uuid id PK
    uuid driver_id FK
    timestamptz started_at
    timestamptz ended_at
    integer total_deliveries
    decimal total_earnings
    decimal total_distance_km
    timestamptz created_at
    timestamptz updated_at
  }
  driver_presence {
    uuid id PK
    uuid driver_id FK
    varchar status
    decimal_10 current_lat
    decimal_11 current_lng
    timestamptz last_location_update
    uuid current_shift_id FK
    timestamptz updated_at
    timestamptz last_location_at
    decimal_10 last_location_lat
    decimal_11 last_location_lng
    timestamptz last_updated_at
  }
  driver_locations {
    uuid id PK
    uuid driver_id FK
    uuid shift_id FK
    decimal lat
    decimal lng
    decimal accuracy
    decimal heading
    decimal speed
    timestamptz recorded_at
    timestamptz created_at
  }
  driver_earnings {
    uuid id PK
    uuid driver_id FK
    uuid delivery_id
    uuid shift_id FK
    decimal base_amount
    decimal tip_amount
    decimal bonus_amount
    decimal total_amount
    timestamptz created_at
  }
  deliveries {
    uuid id PK
    uuid order_id FK
    uuid driver_id FK
    varchar status
    text pickup_address
    decimal pickup_lat
    decimal pickup_lng
    text dropoff_address
    decimal dropoff_lat
    decimal dropoff_lng
    timestamptz estimated_pickup_at
    timestamptz actual_pickup_at
    timestamptz estimated_dropoff_at
    timestamptz actual_dropoff_at
  }
  delivery_assignments {
    uuid id PK
    uuid delivery_id FK
    uuid driver_id FK
    timestamptz offered_at
    timestamptz expires_at
    timestamptz responded_at
    varchar response
    text rejection_reason
    timestamptz created_at
  }
  assignment_attempts {
    uuid id PK
    uuid delivery_id FK
    uuid driver_id FK
    integer attempt_number
    timestamptz offered_at
    timestamptz expires_at
    timestamptz responded_at
    varchar response
    varchar decline_reason
    integer distance_meters
    integer estimated_minutes
    timestamptz created_at
  }
  delivery_events {
    uuid id PK
    uuid delivery_id FK
    varchar event_type
    jsonb event_data
    varchar actor_type
    uuid actor_id
    timestamptz created_at
  }
  delivery_tracking_events {
    uuid id PK
    uuid delivery_id FK
    uuid driver_id FK
    decimal lat
    decimal lng
    decimal accuracy
    timestamptz recorded_at
  }
  deliveries ||--o{ assignment_attempts : "delivery_id"
  drivers ||--o{ assignment_attempts : "driver_id"
  drivers ||--o{ deliveries : "driver_id"
  deliveries ||--o{ delivery_assignments : "delivery_id"
  drivers ||--o{ delivery_assignments : "driver_id"
  deliveries ||--o{ delivery_events : "delivery_id"
  deliveries ||--o{ delivery_tracking_events : "delivery_id"
  drivers ||--o{ delivery_tracking_events : "driver_id"
  drivers ||--o{ driver_documents : "driver_id"
  auth_users ||--o{ driver_documents : "reviewed_by"
  drivers ||--o{ driver_earnings : "driver_id"
  driver_shifts ||--o{ driver_earnings : "shift_id"
  drivers ||--o{ driver_locations : "driver_id"
  driver_shifts ||--o{ driver_locations : "shift_id"
  driver_shifts ||--o{ driver_presence : "current_shift_id"
  drivers ||--o{ driver_presence : "driver_id"
  drivers ||--o{ driver_shifts : "driver_id"
  drivers ||--o{ driver_vehicles : "driver_id"
  auth_users ||--o{ drivers : "user_id"
```

### Payments, Ledger, Payouts, and Finance

```mermaid
erDiagram
  orders {
    uuid id PK
    varchar order_number
    uuid customer_id FK
    uuid storefront_id FK
    uuid delivery_address_id FK
    varchar status
    decimal subtotal
    decimal delivery_fee
    decimal service_fee
    decimal tax
    decimal tip
    decimal total
    varchar payment_status
    varchar payment_intent_id
  }
  ledger_entries {
    uuid id PK
    uuid order_id FK
    varchar entry_type
    integer amount_cents
    varchar currency
    varchar description
    varchar entity_type
    uuid entity_id
    varchar stripe_id
    jsonb metadata
    timestamptz created_at
    text idempotency_key
  }
  payout_runs {
    uuid id PK
    varchar run_type
    varchar status
    timestamptz period_start
    timestamptz period_end
    decimal total_amount
    integer total_recipients
    integer successful_payouts
    integer failed_payouts
    uuid initiated_by FK
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }
  chef_payout_accounts {
    uuid id PK
    uuid chef_id FK
    text stripe_account_id
    boolean is_verified
    timestamptz created_at
    timestamptz updated_at
    text stripe_account_status
    boolean payout_enabled
  }
  chef_payouts {
    uuid id PK
    uuid chef_id FK
    text stripe_transfer_id
    integer amount
    text status
    timestamptz period_start
    timestamptz period_end
    integer orders_count
    timestamptz created_at
    timestamptz paid_at
    uuid payout_run_id FK
    text payment_rail
    text bank_batch_id
    text bank_reference
  }
  driver_payout_accounts {
    uuid id PK
    uuid driver_id FK
    text stripe_account_id
    text status
    boolean charges_enabled
    boolean payouts_enabled
    timestamptz onboarding_completed_at
    timestamptz created_at
    timestamptz updated_at
  }
  driver_payouts {
    uuid id PK
    uuid driver_id FK
    uuid payout_run_id
    decimal amount
    varchar status
    varchar stripe_transfer_id
    timestamptz period_start
    timestamptz period_end
    timestamptz created_at
    timestamptz updated_at
    text stripe_payout_id
    text payment_rail
    text bank_batch_id
    text bank_reference
  }
  platform_accounts {
    uuid id PK
    text account_type
    uuid owner_id
    bigint balance_cents
    bigint pending_payout_cents
    bigint lifetime_earned_cents
    text currency
    timestamptz updated_at
  }
  stripe_events_processed {
    uuid id PK
    text stripe_event_id
    text event_type
    boolean livemode
    timestamptz processed_at
    text processing_status
    uuid related_order_id FK
    uuid related_payment_id
    text payload_hash
    text error_message
    timestamptz created_at
    bigint stripe_amount_cents
  }
  stripe_reconciliation {
    uuid id PK
    text stripe_event_id FK
    uuid ledger_entry_ids
    text status
    bigint variance_cents
    text notes
    uuid resolved_by FK
    timestamptz resolved_at
    timestamptz created_at
    boolean variance_flagged
  }
  instant_payout_requests {
    uuid id PK
    uuid driver_id FK
    bigint amount_cents
    bigint fee_cents
    text status
    text stripe_payout_id
    text failure_reason
    timestamptz requested_at
    timestamptz executed_at
  }
  refund_cases {
    uuid id PK
    uuid order_id FK
    uuid exception_id FK
    uuid requested_by FK
    integer requested_amount_cents
    integer approved_amount_cents
    varchar refund_reason
    text refund_notes
    varchar status
    uuid reviewed_by FK
    timestamptz reviewed_at
    varchar stripe_refund_id
    timestamptz processed_at
    timestamptz created_at
  }
  payout_adjustments {
    uuid id PK
    varchar payee_type
    uuid payee_id
    uuid order_id FK
    uuid refund_case_id FK
    varchar adjustment_type
    integer amount_cents
    text reason
    varchar status
    uuid created_by FK
    uuid applied_to_payout_id
    timestamptz created_at
    timestamptz updated_at
  }
  auth_users ||--o{ chef_payouts : "approved_by"
  auth_users ||--o{ chef_payouts : "executed_by"
  payout_runs ||--o{ chef_payouts : "payout_run_id"
  auth_users ||--o{ driver_payouts : "approved_by"
  auth_users ||--o{ driver_payouts : "executed_by"
  orders ||--o{ ledger_entries : "order_id"
  auth_users ||--o{ orders : "cancelled_by"
  auth_users ||--o{ payout_adjustments : "created_by"
  orders ||--o{ payout_adjustments : "order_id"
  refund_cases ||--o{ payout_adjustments : "refund_case_id"
  auth_users ||--o{ payout_runs : "initiated_by"
  orders ||--o{ refund_cases : "order_id"
  auth_users ||--o{ refund_cases : "requested_by"
  auth_users ||--o{ refund_cases : "reviewed_by"
  orders ||--o{ stripe_events_processed : "related_order_id"
  stripe_events_processed ||--o{ stripe_reconciliation : "stripe_event_id"
```

### Ops, Engine, Support, and Audit

```mermaid
erDiagram
  domain_events {
    uuid id PK
    varchar event_type
    varchar entity_type
    uuid entity_id
    jsonb payload
    uuid actor_user_id FK
    varchar actor_role
    uuid actor_entity_id
    integer version
    boolean published
    timestamptz published_at
    timestamptz created_at
  }
  order_exceptions {
    uuid id PK
    varchar exception_type
    varchar severity
    varchar status
    uuid order_id FK
    uuid customer_id FK
    uuid chef_id FK
    uuid driver_id FK
    uuid delivery_id FK
    varchar title
    text description
    jsonb recommended_actions
    text internal_notes
    text resolution
  }
  sla_timers {
    uuid id PK
    varchar sla_type
    varchar status
    varchar entity_type
    uuid entity_id
    timestamptz started_at
    timestamptz warning_at
    timestamptz deadline_at
    timestamptz completed_at
    timestamptz breached_at
    jsonb metadata
    timestamptz created_at
    timestamptz updated_at
  }
  kitchen_queue_entries {
    uuid id PK
    uuid storefront_id FK
    uuid order_id FK
    integer position
    integer estimated_prep_minutes
    integer actual_prep_minutes
    varchar status
    timestamptz started_at
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }
  ops_override_logs {
    uuid id PK
    varchar action
    varchar entity_type
    uuid entity_id
    jsonb before_state
    jsonb after_state
    text reason
    uuid actor_user_id FK
    varchar actor_role
    uuid approved_by FK
    timestamptz created_at
  }
  system_alerts {
    uuid id PK
    varchar alert_type
    varchar severity
    varchar title
    text message
    varchar entity_type
    uuid entity_id
    boolean acknowledged
    uuid acknowledged_by FK
    timestamptz acknowledged_at
    boolean auto_resolved
    timestamptz resolved_at
    jsonb metadata
    timestamptz created_at
  }
  support_tickets {
    uuid id PK
    uuid order_id FK
    uuid customer_id FK
    uuid chef_id FK
    uuid driver_id
    varchar subject
    text description
    varchar status
    varchar priority
    uuid assigned_to FK
    timestamptz resolved_at
    timestamptz created_at
    timestamptz updated_at
  }
  admin_notes {
    uuid id PK
    varchar entity_type
    uuid entity_id
    text note
    uuid created_by FK
    timestamptz created_at
  }
  audit_logs {
    uuid id PK
    varchar actor_type
    uuid actor_id
    varchar action
    varchar entity_type
    uuid entity_id
    jsonb old_data
    jsonb new_data
    inet ip_address
    text user_agent
    timestamptz created_at
    text actor_role
    text reason
    jsonb metadata
  }
  ops_processor_runs {
    uuid id PK
    text processor_name
    text idempotency_key
    text status
    timestamptz started_at
    timestamptz finished_at
    jsonb result
    text error_message
  }
  platform_settings {
    uuid id PK
    decimal_5 platform_fee_percent
    decimal_5 service_fee_percent
    decimal_5 hst_rate
    decimal_10 min_order_amount
    decimal_5 max_delivery_radius_km
    timestamptz updated_at
    decimal_5 dispatch_radius_km
    decimal_5 max_delivery_distance_km
    integer default_prep_time_minutes
    integer offer_timeout_seconds
    integer max_assignment_attempts
    boolean auto_assign_enabled
    integer refund_auto_review_threshold_cents
  }
  service_areas {
    uuid id PK
    text name
    geography polygon
    boolean is_active
    numeric surge_multiplier
    numeric dispatch_radius_km
    integer offer_ttl_seconds
    integer max_offer_attempts
    timestamptz created_at
    timestamptz updated_at
  }
  analytics_events {
    uuid id PK
    varchar event_name
    jsonb properties
    uuid user_id
    text session_id
    text page_url
    text referrer
    text user_agent
    timestamptz created_at
  }
  auth_users ||--o{ admin_notes : "created_by"
  auth_users ||--o{ audit_logs : "user_id"
  auth_users ||--o{ domain_events : "actor_user_id"
  auth_users ||--o{ ops_override_logs : "actor_user_id"
  auth_users ||--o{ ops_override_logs : "approved_by"
  auth_users ||--o{ order_exceptions : "resolved_by"
  auth_users ||--o{ platform_settings : "updated_by"
  auth_users ||--o{ support_tickets : "assigned_to"
  auth_users ||--o{ system_alerts : "acknowledged_by"
```

### Growth, Promo, Loyalty, and Referral

```mermaid
erDiagram
  promo_codes {
    uuid id PK
    text code
    text description
    text discount_type
    decimal discount_value
    decimal min_order_amount
    decimal max_discount
    integer usage_limit
    integer usage_count
    timestamptz starts_at
    timestamptz expires_at
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }
  loyalty_accounts {
    uuid id PK
    uuid customer_id FK
    integer points_balance
    integer lifetime_points
    text tier
    timestamptz created_at
    timestamptz updated_at
  }
  loyalty_transactions {
    uuid id PK
    uuid loyalty_account_id FK
    uuid order_id FK
    integer points
    text type
    text description
    timestamptz created_at
  }
  referral_codes {
    uuid id PK
    uuid user_id FK
    text user_type
    text code
    integer uses_count
    integer max_uses
    integer reward_cents
    boolean is_active
    timestamptz created_at
  }
  referral_signups {
    uuid id PK
    uuid referral_code_id FK
    uuid referred_user_id FK
    text referred_user_type
    text status
    uuid first_order_id FK
    boolean reward_paid
    timestamptz created_at
  }
  loyalty_accounts ||--o{ loyalty_transactions : "loyalty_account_id"
  auth_users ||--o{ referral_codes : "user_id"
  referral_codes ||--o{ referral_signups : "referral_code_id"
  auth_users ||--o{ referral_signups : "referred_user_id"
```

## Review Gaps

| Name | Surfaces | Example File | Review Note |
| --- | --- | --- | --- |
| None | None | None | None |

## Linked Repo Docs

- `docs/architecture/supabase/SUPABASE_SQL_DIAGRAM.md`
- `docs/architecture/supabase/SUPABASE_TABLE_INVENTORY.md`
- `docs/architecture/supabase/SUPABASE_APP_USAGE_MATRIX.md`
- `graphify-out/ridendine-codebase-map/supabase-graph.json`
