# Chef Kitchen OS — Data Model

## Stage 5 — Kitchen ticket internal state

Migration: `supabase/migrations/00054_kitchen_ticket_state.sql` (**additive**;
authored, not yet applied — run `pnpm db:migrate`, then `pnpm db:generate` to
refresh `@ridendine/db` types).

### Core principle

Kitchen ticket state is **internal kitchen truth** and is strictly separate
from the **public order lifecycle** (`orders.status` / `orders.engine_status`).
The public state machine is untouched. The only bridge is one‑directional:

```
public order status ──(engine)──▶ kitchen_status      ✅ derive on order advance
kitchen_status      ──/ /──▶      public order status  ❌ never
```

`packing` is a kitchen‑only `kitchen_status` with **no** public order status —
proving internal states don't leak into the public machine. The mapping and
transition rules live in `packages/engine/src/orchestrators/kitchen-ticket-state.ts`
(pure, unit‑tested): `kitchenStatusForOrderStatus`, `isValidKitchenTicketTransition`,
`shouldPreserveKitchenStatus`.

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `kitchen_stations` | Chef's prep stations | `storefront_id`, `name`, `sort_order`, `is_active` |
| `kitchen_tickets` | One internal ticket per order | `storefront_id`, `order_id` (unique), `queue_entry_id`, `kitchen_status`, `priority`, `station_id`, `started_at`/`packing_started_at`/`packed_at`/`ready_at`, `problem_reason`, `notes`, `metadata` |
| `kitchen_ticket_items` | Per‑line kitchen state | `ticket_id`, `order_item_id`, `menu_item_id`, `station_id`, `status`, `quantity`, `modifiers_snapshot`, `allergen_flags`, `special_instructions` |
| `kitchen_ticket_events` | Immutable audit trail | `ticket_id`, `storefront_id`, `event_type`, `from_status`, `to_status`, `actor_user_id`, `detail` |
| `order_pack_checks` | Packing / handoff checklist | `order_id` (unique), `ticket_id`, `storefront_id`, `checked_items`, `bag_count`, `utensils_included`, `sauces_included`, `allergy_label_applied`, `sealed`, `photo_url`, `completed_by`, `completed_at` |

`kitchen_status` enum: `new → accepted → preparing → (packing) → ready →
completed`, with `problem` (recoverable) and `cancelled` (terminal). Allowed
transitions are enforced in the engine state machine; the DB column also has a
`CHECK` constraint on the value set.

> `kitchen_station_assignments` (staff↔station) is **deferred to the labour
> stage**, where `kitchen_staff` is introduced — creating it now would be a
> dangling table with no staff to reference.

### RLS

Every table has RLS enabled. Policies follow the repo's existing idiom:

- **Chef** — full access to rows whose `storefront_id` resolves to the
  authenticated chef via `chef_storefronts → chef_profiles.user_id = auth.uid()`
  (`kitchen_ticket_items` scopes through its parent ticket;
  `kitchen_ticket_events` is chef **read‑only** — it's an audit trail).
- **Ops / platform staff** — read‑only across all storefronts via
  `public.is_platform_staff(auth.uid())` (monitoring).
- **service_role** — full access (all server‑side writes go through the admin
  client; the chef app never writes these tables from the browser directly).
- **Customers / drivers** — no policy ⇒ no access.

### Validation (`@ridendine/validation`)

`packages/validation/src/schemas/kitchen.ts`:
`updateKitchenTicketSchema` (status move; `problemReason` required for
`problem`), `kitchenStationSchema`, `updateKitchenTicketItemSchema`,
`packChecklistSchema`.

### Not yet wired (next sub‑step)

The migration + state machine + schemas are the foundation. Still to do once the
migration is applied: engine methods to create/advance a `kitchen_ticket`
alongside the order engine's accept/prep/ready actions, the
`GET/PATCH /api/kitchen/tickets/[id]` write paths, the packing checklist API,
and the KDS "Packing" column. These are intentionally not shipped half‑wired
against tables that don't exist in the live DB yet.

## Stage 6 — Recipes & food cost

Migration: `supabase/migrations/00055_recipes_and_costing.sql` (**additive**;
authored, not yet applied). Adds `public.is_chef_of_storefront(uuid)` — a
`SECURITY DEFINER` predicate that DRYs the nested-table RLS policies.

### Tables

| Table | Purpose |
|---|---|
| `recipes` | A recipe, optionally linked to a `menu_item` (`storefront_id` scoped) |
| `recipe_versions` | Versioned definition: `batch_yield`, `portion_size`, `waste_factor`, `is_active` |
| `recipe_ingredients` | Per‑version lines: `name`, `quantity`, `unit`, `cost_per_unit`, `waste_factor`, `inventory_item_id` (plain UUID; FK added in the inventory stage) |
| `recipe_steps` | Per‑version prep/cook steps with optional `station` |
| `menu_item_recipe_versions` | Active recipe version per menu item |
| `recipe_cost_snapshots` | **Point‑in‑time** cost (so historical orders are never re‑priced with today's costs) |
| `packaging_items` | Chef's packaging catalogue (`storefront_id` scoped) |
| `menu_item_packaging` | Packaging used by a menu item, with `quantity` |

### Costing math (`@ridendine/engine`)

`packages/engine/src/services/costing.service.ts` is **pure** (no DB): callers
pass already‑fetched ingredient/packaging rows. Formulas:

```
ingredientLineCost = quantity * costPerUnit * (1 + wasteFactor)
batchIngredientCost = Σ ingredientLineCost
perPortionFoodCost  = batchIngredientCost / batchYield   (batchYield<=0 ⇒ batchCost)
packagingCost       = Σ (costPerUnit * quantity)
totalItemCost       = perPortionFoodCost + packagingCost
grossMargin         = sellPrice - totalItemCost
foodCostPct         = totalItemCost / sellPrice           (null when sellPrice = 0)
suggestedPrice      = totalItemCost / targetFoodCostPct    (default target 30%)
marginWarning       = foodCostPct > targetFoodCostPct
```

`computeMenuItemCosting(input)` returns the full rounded breakdown. **No fake
data** — a menu item with no recipe simply has no costing to show.

### Validation

`packages/validation/src/schemas/recipe.ts`: `createRecipeSchema`,
`createRecipeVersionSchema`, `recipeIngredientSchema`, `recipeStepSchema`,
`packagingItemSchema`, `menuItemPackagingSchema`, `attachRecipeToMenuItemSchema`.

### Not yet wired

Recipe/costing CRUD APIs (`/api/recipes`, `/api/menu/[id]/recipe`,
`/api/menu/[id]/cost`, `/api/costs/overview`), the recipe builder UI, and the
recipe engine that writes `recipe_cost_snapshots` at order time — all land once
`00055` is applied. The costing math they call is already built and tested.

## Stage 7 — Inventory

Migration: `supabase/migrations/00056_inventory.sql` (**additive**; authored, not
yet applied). Also wires the deferred `recipe_ingredients.inventory_item_id` FK.

### Source of truth: a movement ledger

`inventory_stock_movements` is authoritative — **on-hand = Σ signed movement
quantities**. `inventory_items.current_quantity` is a **cache** the API keeps in
step. Movement signs (`packages/engine/src/orchestrators/inventory.engine.ts`,
pure): `receive`/`return` add; `consume_order`/`consume_batch`/`waste` subtract;
`adjustment`/`count_correction`/`transfer` carry an explicit sign.

### Tables

`storage_locations`, `inventory_items`, `inventory_stock_movements`,
`inventory_counts`, `inventory_count_lines`, `inventory_waste_events`,
`inventory_alerts`. RLS mirrors the earlier stages (chef → own storefront via
`is_chef_of_storefront`; ops read‑only; service_role full; movements are chef
**read‑only**). Types are mirrored into `packages/db/src/database.merged.ts` so
the wired routes are strictly typed before `db:generate` runs.

### Engine intelligence (pure, tested)

`computeStockStatus` (stockout/low/ok), `computeReorderSuggestion` (qty back to
par), `ordersRemaining`, `computeInventoryAlerts` (low_stock / stockout /
expiring_soon / expired — stock and expiry independent).

### APIs (wired — active once 00056 is applied)

`GET/POST /api/inventory`, `GET/PATCH /api/inventory/[id]`,
`POST /api/inventory/[id]/movement`, `GET /api/inventory/alerts`,
`POST /api/inventory/counts`, `POST /api/inventory/waste`. All authenticate the
chef, scope every query by `storefront_id` (ownership), rate‑limit writes
(`chefWrite`), validate with `@ridendine/validation`, and audit‑log creates.
See `docs/chef-kitchen-api.md`.

## Verification

```bash
pnpm --filter @ridendine/db typecheck
pnpm --filter @ridendine/engine typecheck && pnpm --filter @ridendine/engine exec vitest run kitchen-ticket-state costing.service inventory.engine
pnpm --filter @ridendine/validation typecheck && pnpm --filter @ridendine/validation exec vitest run kitchen recipe inventory
pnpm --filter @ridendine/chef-admin typecheck && pnpm --filter @ridendine/chef-admin exec jest
```
