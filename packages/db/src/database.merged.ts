/**
 * Merges finance / Phase 5+ schema columns that may be missing from generated
 * `database.types.ts` when typegen runs against an older remote DB.
 * Prefer regenerating types after applying migrations; this keeps the client strictly typed.
 */
import type { Database as GeneratedDatabase } from './generated/database.types';

type GenPublic = GeneratedDatabase['public'];
type GenTables = GenPublic['Tables'];
type GenFunctions = GenPublic['Functions'];

type PlatformAccountsTable = {
  Row: {
    id: string;
    account_type: string;
    owner_id: string;
    balance_cents: number;
    pending_payout_cents: number;
    lifetime_earned_cents: number;
    currency: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    account_type: string;
    owner_id: string;
    balance_cents?: number;
    pending_payout_cents?: number;
    lifetime_earned_cents?: number;
    currency?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    account_type?: string;
    owner_id?: string;
    balance_cents?: number;
    pending_payout_cents?: number;
    lifetime_earned_cents?: number;
    currency?: string;
    updated_at?: string;
  };
  Relationships: [];
};

type StripeReconciliationTable = {
  Row: {
    id: string;
    stripe_event_id: string;
    ledger_entry_ids: string[];
    status: string;
    variance_cents: number;
    variance_flagged: boolean;
    notes: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    stripe_event_id: string;
    ledger_entry_ids?: string[];
    status?: string;
    variance_cents?: number;
    variance_flagged?: boolean;
    notes?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    stripe_event_id?: string;
    ledger_entry_ids?: string[];
    status?: string;
    variance_cents?: number;
    variance_flagged?: boolean;
    notes?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at?: string;
  };
  Relationships: [];
};

type InstantPayoutRequestsTable = {
  Row: {
    id: string;
    driver_id: string;
    amount_cents: number;
    fee_cents: number;
    status: string;
    stripe_payout_id: string | null;
    failure_reason: string | null;
    requested_at: string;
    executed_at: string | null;
  };
  Insert: {
    id?: string;
    driver_id: string;
    amount_cents: number;
    fee_cents: number;
    status?: string;
    stripe_payout_id?: string | null;
    failure_reason?: string | null;
    requested_at?: string;
    executed_at?: string | null;
  };
  Update: {
    id?: string;
    driver_id?: string;
    amount_cents?: number;
    fee_cents?: number;
    status?: string;
    stripe_payout_id?: string | null;
    failure_reason?: string | null;
    requested_at?: string;
    executed_at?: string | null;
  };
  Relationships: [];
};

type ServiceAreasTable = {
  Row: {
    id: string;
    name: string;
    polygon: unknown;
    is_active: boolean;
    surge_multiplier: number;
    dispatch_radius_km: number | null;
    offer_ttl_seconds: number | null;
    max_offer_attempts: number | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    name: string;
    polygon: unknown;
    is_active?: boolean;
    surge_multiplier?: number;
    dispatch_radius_km?: number | null;
    offer_ttl_seconds?: number | null;
    max_offer_attempts?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    polygon?: unknown;
    is_active?: boolean;
    surge_multiplier?: number;
    dispatch_radius_km?: number | null;
    offer_ttl_seconds?: number | null;
    max_offer_attempts?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};

type DriversExtended = Omit<GenTables['drivers'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['drivers']['Row'] & {
    instant_payouts_enabled?: boolean;
    stripe_connect_account_id?: string | null;
    payout_blocked?: boolean;
  };
  Insert: GenTables['drivers']['Insert'] & {
    instant_payouts_enabled?: boolean;
    stripe_connect_account_id?: string | null;
    payout_blocked?: boolean;
  };
  Update: GenTables['drivers']['Update'] & {
    instant_payouts_enabled?: boolean;
    stripe_connect_account_id?: string | null;
    payout_blocked?: boolean;
  };
};

type ChefPayoutsExtended = Omit<GenTables['chef_payouts'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['chef_payouts']['Row'] & { payout_run_id?: string | null };
  Insert: GenTables['chef_payouts']['Insert'] & { payout_run_id?: string | null };
  Update: GenTables['chef_payouts']['Update'] & { payout_run_id?: string | null };
};

type DriverPayoutsExtended = Omit<GenTables['driver_payouts'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['driver_payouts']['Row'] & { stripe_payout_id?: string | null };
  Insert: GenTables['driver_payouts']['Insert'] & { stripe_payout_id?: string | null };
  Update: GenTables['driver_payouts']['Update'] & { stripe_payout_id?: string | null };
};

type StripeEventsExtended = Omit<GenTables['stripe_events_processed'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['stripe_events_processed']['Row'] & { stripe_amount_cents?: number | null };
  Insert: GenTables['stripe_events_processed']['Insert'] & { stripe_amount_cents?: number | null };
  Update: GenTables['stripe_events_processed']['Update'] & { stripe_amount_cents?: number | null };
};

// Migration 00043 — typegen ran against an older remote DB without this table.
type PromoCodeUsagesTable = {
  Row: {
    id: string;
    promo_id: string;
    customer_id: string;
    order_id: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    promo_id: string;
    customer_id: string;
    order_id?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    promo_id?: string;
    customer_id?: string;
    order_id?: string | null;
    created_at?: string;
  };
  Relationships: [];
};

// Migration 00045 — SECURITY DEFINER aggregation RPCs missing from typegen.
type LiabilitySummaryReturns = Array<{
  id: string;
  name: string | null;
  amount: number;
}>;

type MergedFunctions = GenFunctions & {
  get_chef_liability_summaries: {
    Args: { p_limit?: number };
    Returns: LiabilitySummaryReturns;
  };
  get_driver_liability_summaries: {
    Args: { p_limit?: number };
    Returns: LiabilitySummaryReturns;
  };
};

// customers.user_id was made nullable by migration 00030 purely so dev/staging
// seed rows can exist without auth users. Every application-created customer
// has a user_id, and engine + app code (customers.service, push subscription
// routes) rely on it being present. Narrow Row to non-null; Insert/Update keep
// the generated nullable shape so seed-style writes still typecheck.
type CustomersNarrowed = Omit<GenTables['customers'], 'Row'> & {
  Row: Omit<GenTables['customers']['Row'], 'user_id'> & { user_id: string };
};

// packages/engine permissions.service upserts platform_users rows with only
// (user_id, role, is_active, updated_at) — valid for the update path of the
// upsert on existing rows. email/name are NOT NULL in the schema but are made
// optional here so that pre-existing call pattern keeps compiling.
type PlatformUsersLoosened = Omit<GenTables['platform_users'], 'Insert' | 'Update'> & {
  Insert: Omit<GenTables['platform_users']['Insert'], 'email' | 'name'> & {
    email?: string;
    name?: string;
  };
  Update: GenTables['platform_users']['Update'];
};

// apps/web notifications routes reference legacy alias columns `read` and
// `action_url` that the canonical schema spells `is_read` / (no equivalent).
// Kept as optional members for compile compatibility with that pre-existing
// code path; regenerating after a column-alias migration should remove this.
type NotificationsWithAliases = {
  Row: GenTables['notifications']['Row'] & {
    read?: boolean | null;
    action_url?: string | null;
  };
  // body is NOT NULL in-schema but migration 00010 installed a trigger that
  // backfills it from `message`, so inserts may omit it.
  Insert: Omit<GenTables['notifications']['Insert'], 'body'> & {
    body?: string;
    read?: boolean | null;
    action_url?: string | null;
  };
  Update: GenTables['notifications']['Update'] & {
    read?: boolean | null;
    action_url?: string | null;
  };
  Relationships: GenTables['notifications']['Relationships'];
};

// ------------------------------------------------------------------
// Migration 00056 — inventory tables (typegen runs against an older remote DB).
// ------------------------------------------------------------------
type StorageLocationsTable = {
  Row: { id: string; storefront_id: string; name: string; type: string; created_at: string; updated_at: string };
  Insert: { id?: string; storefront_id: string; name: string; type?: string; created_at?: string; updated_at?: string };
  Update: { id?: string; storefront_id?: string; name?: string; type?: string; created_at?: string; updated_at?: string };
  Relationships: [];
};

type InventoryItemsTable = {
  Row: {
    id: string;
    storefront_id: string;
    name: string;
    category: string | null;
    unit: string;
    current_quantity: number;
    par_quantity: number | null;
    reorder_point: number | null;
    cost_per_unit: number;
    preferred_supplier_id: string | null;
    storage_location_id: string | null;
    expiry_date: string | null;
    lot_code: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    name: string;
    category?: string | null;
    unit?: string;
    current_quantity?: number;
    par_quantity?: number | null;
    reorder_point?: number | null;
    cost_per_unit?: number;
    preferred_supplier_id?: string | null;
    storage_location_id?: string | null;
    expiry_date?: string | null;
    lot_code?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<InventoryItemsTable['Insert']>;
  Relationships: [];
};

type InventoryStockMovementsTable = {
  Row: {
    id: string;
    storefront_id: string;
    inventory_item_id: string;
    movement_type: string;
    quantity: number;
    unit_cost: number | null;
    reference_type: string | null;
    reference_id: string | null;
    note: string | null;
    created_by: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    inventory_item_id: string;
    movement_type: string;
    quantity: number;
    unit_cost?: number | null;
    reference_type?: string | null;
    reference_id?: string | null;
    note?: string | null;
    created_by?: string | null;
    created_at?: string;
  };
  Update: Partial<InventoryStockMovementsTable['Insert']>;
  Relationships: [];
};

type InventoryCountsTable = {
  Row: {
    id: string;
    storefront_id: string;
    status: string;
    counted_by: string | null;
    note: string | null;
    created_at: string;
    completed_at: string | null;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    status?: string;
    counted_by?: string | null;
    note?: string | null;
    created_at?: string;
    completed_at?: string | null;
  };
  Update: Partial<InventoryCountsTable['Insert']>;
  Relationships: [];
};

type InventoryCountLinesTable = {
  Row: {
    id: string;
    count_id: string;
    inventory_item_id: string;
    counted_quantity: number;
    system_quantity: number | null;
    variance: number | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    count_id: string;
    inventory_item_id: string;
    counted_quantity: number;
    system_quantity?: number | null;
    variance?: number | null;
    created_at?: string;
  };
  Update: Partial<InventoryCountLinesTable['Insert']>;
  Relationships: [];
};

type InventoryWasteEventsTable = {
  Row: {
    id: string;
    storefront_id: string;
    inventory_item_id: string;
    quantity: number;
    reason: string | null;
    cost_value: number | null;
    created_by: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    inventory_item_id: string;
    quantity: number;
    reason?: string | null;
    cost_value?: number | null;
    created_by?: string | null;
    created_at?: string;
  };
  Update: Partial<InventoryWasteEventsTable['Insert']>;
  Relationships: [];
};

type InventoryAlertsTable = {
  Row: {
    id: string;
    storefront_id: string;
    inventory_item_id: string;
    alert_type: string;
    status: string;
    detail: Record<string, unknown>;
    created_at: string;
    resolved_at: string | null;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    inventory_item_id: string;
    alert_type: string;
    status?: string;
    detail?: Record<string, unknown>;
    created_at?: string;
    resolved_at?: string | null;
  };
  Update: Partial<InventoryAlertsTable['Insert']>;
  Relationships: [];
};

type MergedTables = Omit<
  GenTables,
  | 'drivers'
  | 'chef_payouts'
  | 'driver_payouts'
  | 'stripe_events_processed'
  | 'customers'
  | 'platform_users'
  | 'notifications'
> & {
  customers: CustomersNarrowed;
  platform_users: PlatformUsersLoosened;
  notifications: NotificationsWithAliases;
  drivers: DriversExtended;
  chef_payouts: ChefPayoutsExtended;
  driver_payouts: DriverPayoutsExtended;
  stripe_events_processed: StripeEventsExtended;
  stripe_reconciliation: StripeReconciliationTable;
  platform_accounts: PlatformAccountsTable;
  instant_payout_requests: InstantPayoutRequestsTable;
  service_areas: ServiceAreasTable;
  promo_code_usages: PromoCodeUsagesTable;
  storage_locations: StorageLocationsTable;
  inventory_items: InventoryItemsTable;
  inventory_stock_movements: InventoryStockMovementsTable;
  inventory_counts: InventoryCountsTable;
  inventory_count_lines: InventoryCountLinesTable;
  inventory_waste_events: InventoryWasteEventsTable;
  inventory_alerts: InventoryAlertsTable;
};

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GenPublic, 'Tables' | 'Functions'> & {
    Tables: MergedTables;
    Functions: MergedFunctions;
  };
};
