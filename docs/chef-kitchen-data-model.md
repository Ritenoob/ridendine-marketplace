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

## Verification

```bash
pnpm --filter @ridendine/engine typecheck && pnpm --filter @ridendine/engine exec vitest run kitchen-ticket-state
pnpm --filter @ridendine/validation typecheck && pnpm --filter @ridendine/validation exec vitest run kitchen
```
