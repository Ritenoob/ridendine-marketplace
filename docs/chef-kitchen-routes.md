# Chef Kitchen OS — Routes

Chef app pages under `apps/chef-admin/src/app/dashboard`. Sidebar nav lives in
`components/layout/sidebar.tsx`.

| Route | Purpose | Status |
|---|---|---|
| `/dashboard` | Operating dashboard | existing |
| `/dashboard/kitchen` | **Kitchen Command** — live KDS, today's metrics, prep, service control | Stage 2/3 ✓ |
| `/dashboard/orders` | **Order ledger** — history, filters, trace, CSV export | Stage 1 ✓ |
| `/dashboard/orders/[id]` | Order detail (support/trace) | existing |
| `/dashboard/menu` | Menu management | existing |
| `/dashboard/inventory` | **Inventory** — stock, receive, waste, counts, alerts | Stage 7 ✓ |
| `/dashboard/storefront` · `/availability` · `/reviews` · `/customers` · `/payouts` · `/analytics` · `/growth` · `/settings` | existing surfaces | existing |

## Inventory UI (`/dashboard/inventory`)

Client page that reads `GET /api/inventory` + `GET /api/inventory/alerts` and renders:

- KPI tiles — items tracked, low/out count, expiring count, stock value (Σ qty × cost).
- An **attention** panel from computed alerts (low stock / stockout / expiring / expired) with reorder suggestions.
- A stock table (on‑hand, par, reorder point, cost/unit, status badge) with per‑row
  **Receive / Waste / Edit** actions.
- A real **empty state** (no fabricated rows) when nothing is tracked yet.

Modals:
- `components/inventory/inventory-item-modal.tsx` — add/edit an item (`POST /api/inventory`, `PATCH /api/inventory/[id]`).
- `components/inventory/stock-movement-modal.tsx` — receive / waste / adjust
  (`POST /api/inventory/[id]/movement`, `POST /api/inventory/waste`).

> The page renders and type‑checks today; live data appears once `00056` is
> applied (`pnpm db:migrate && pnpm db:generate`). Until then the APIs return
> empty/errors gracefully and the page shows its empty state.

## Planned (later stages)

`/dashboard/recipes` + `/dashboard/menu/[id]/recipe` (Stage 6 UI),
`/dashboard/costs` (Stage 11), `/dashboard/production` (Stage 9),
`/dashboard/labor` (Stage 10).
