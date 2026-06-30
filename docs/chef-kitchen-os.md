# Chef Kitchen OS — Upgrade Log & Roadmap

Turning `apps/chef-admin` from an order dashboard into a full **Kitchen Operating
System**. Staged delivery with a verification gate per stage. The customer, ops,
and driver apps and the shared order engine must keep working at every step.

## Non‑negotiable rules

- **No order lifecycle change bypasses the engine/state machine.** UI/routes
  never mutate `orders.status` / `orders.engine_status` directly — all
  transitions go through the existing `PATCH /api/orders/[id]` action contract
  (`accept` / `start_preparing` / `mark_ready` / `reject` …).
- **Internal kitchen states are ticket‑level, not public order statuses.**
  (e.g. a future "packing" state must not become a public order status.)
- **No fake data.** Empty states and "needs setup" cards are fine; fabricated
  metrics are not.

## Kitchen ticket vs order status

- **Orders** are transaction truth (customer/payment/delivery). The Orders tab
  (`/dashboard/orders`) is now a **read‑only ledger** for history, search,
  trace and support — it does not run live service.
- **Kitchen Command** (`/dashboard/kitchen`) is the live operating surface
  (KDS, accept/prep/ready workflow, service controls, today's metrics).

## Delivered

### Stage 1 — Kitchen vs Orders split
- `components/orders/orders-ledger.tsx` — read‑only ledger: filters (search,
  kitchen status, payment status, delivery status, date range, issues‑only),
  columns (order #, customer, total, payment, kitchen status, delivery,
  created/ready/completed), CSV export, row → `/dashboard/orders/[id]`.
- `app/dashboard/orders/page.tsx` renders `OrdersLedger`.
- Removed the duplicate live‑workflow board (`orders-list.tsx`); the live
  workflow already exists in Kitchen Command's `kitchen-order-queue.tsx`.

### Stage 3 — Realtime ticket hydration
- **New API:** `GET /api/kitchen/tickets/[id]` — hydrates one kitchen ticket
  (items, modifiers via special instructions, customer, prep times, estimated
  ready), scoped to the authenticated chef's storefront (ownership check).
- `kitchen-order-queue.tsx` now fetches the fully hydrated ticket on every
  realtime INSERT/UPDATE, so a live ticket **never shows empty items**. Adds:
  - `confirmedById` + status‑rank reconciliation: a stale 30s poll cannot
    revert a confirmed optimistic transition or an in‑flight action.
  - one chime per new order; thin fallback only if hydration fails (poll
    repairs it within 30s).

### Stage 2 — Kitchen Command header (real metrics only)
- **New pure fn:** `computeServiceMetrics` in `lib/kitchen.ts` — active/new/
  in‑prep/ready/late counts, today's sales, today's **actual** average prep
  time, sold‑out / at‑daily‑limit items. Unit‑tested in `lib/__tests__/kitchen.test.ts`.
- `GET /api/kitchen/overview` now also returns `metrics`.
- **New component:** `components/kitchen/kitchen-command-header.tsx` — glanceable
  metric tiles + stock‑blocker card + **honest "needs setup" cards** for food /
  labour / prime cost (these stay un‑numbered until recipes (Stage 6) and
  labour (Stage 10) exist).

## Verification (run from repo root)

```bash
pnpm --filter @ridendine/chef-admin typecheck   # PASS
pnpm --filter @ridendine/chef-admin exec jest    # 17 suites / 107 tests PASS
```

Known pre‑existing repo issues (not introduced here): full `pnpm typecheck`
fails on a Supabase version drift in another package; `pnpm lint` reports
`no-require-imports` in test files and `db-boundary` warnings on raw `.from`
calls across the kitchen routes (existing convention).

## Roadmap (not yet built)

Stages 4–14 introduce **~40 new tables** (kitchen_tickets, recipes, inventory,
suppliers, production, labour, cost snapshots, daily summaries…), ~50 APIs and
6 engines. **Migration policy: author files only** into `supabase/migrations/`
starting at `00054_…` — never applied to the live Supabase automatically; the
owner runs `pnpm db:migrate`. Each new table needs RLS (chef sees only their
storefront; ops sees all; customers/drivers excluded) and Zod schemas in
`@ridendine/validation`. Recommended next stage: **Stage 5 — kitchen ticket
internal state** (unlocks packing column + close‑of‑day without touching public
order statuses).
