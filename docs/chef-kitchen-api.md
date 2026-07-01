# Chef Kitchen OS — API

All routes live under `apps/chef-admin`. Every route:

- authenticates via `getChefActorContext()` (401 if not an approved chef);
- scopes **every** query by the chef's `storefront_id` — that scoping *is* the
  ownership check, so a chef can never read/write another storefront's data;
- validates request bodies with `@ridendine/validation` Zod schemas (400 on
  failure);
- rate‑limits writes with `RATE_LIMIT_POLICIES.chefWrite`;
- uses the server‑only admin client (`createAdminClient`); never the browser.

> Routes that read/write Stage 5–7 tables are **active once their migration is
> applied** (`pnpm db:migrate` + `pnpm db:generate`). They are type‑checked
> against the merged DB types today.

## Kitchen tickets (Stage 3)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/kitchen/overview` | Live load, today's metrics, prep plan/board, tickets |
| GET | `/api/kitchen/tickets/[id]` | Hydrate one ticket (items, customer, prep times) |
| POST/DELETE | `/api/kitchen/pause` | Pause / resume new orders |

## Inventory (Stage 7)

| Method | Path | Body schema | Effect |
|---|---|---|---|
| GET | `/api/inventory` | — | List items + `stockStatus` |
| POST | `/api/inventory` | `createInventoryItemSchema` | Create item; seeds a `receive` movement if it opens with stock |
| GET | `/api/inventory/[id]` | — | Item, ledger‑derived on‑hand, reorder suggestion, recent movements |
| PATCH | `/api/inventory/[id]` | `updateInventoryItemSchema` | Update item fields (not quantity) |
| POST | `/api/inventory/[id]/movement` | `inventoryMovementSchema` | Append a signed ledger movement; updates the cached quantity |
| GET | `/api/inventory/alerts` | — | Computed low‑stock / stockout / expiry alerts + reorder suggestions |
| POST | `/api/inventory/counts` | `inventoryCountSchema` | Record a physical count; reconciles variances with `count_correction` movements |
| POST | `/api/inventory/waste` | `inventoryWasteSchema` | Log waste: event + negative `waste` movement + cost value |

### Movement sign rules

`magnitude` (positive) is supplied for directional types and the engine signs
it: `receive`/`return` → `+`, `consume_order`/`consume_batch`/`waste` → `-`.
`adjustment`/`count_correction`/`transfer` instead take an explicit
`signedQuantity`.

## Suppliers & purchasing (Stage 8)

| Method | Path | Body schema | Effect |
|---|---|---|---|
| GET | `/api/suppliers` | — | List suppliers |
| POST | `/api/suppliers` | `createSupplierSchema` | Create supplier |
| GET | `/api/suppliers/[id]` | — | Supplier + catalogue items |
| PATCH | `/api/suppliers/[id]` | `updateSupplierSchema` | Update supplier |
| POST | `/api/suppliers/[id]/items` | `supplierItemSchema` | Add catalogue item + seed price history |
| GET | `/api/purchase-orders` | — | List purchase orders |
| POST | `/api/purchase-orders` | `createPurchaseOrderSchema` | Create a draft PO with lines (total computed) |
| GET | `/api/purchase-orders/[id]` | — | PO + lines |
| PATCH | `/api/purchase-orders/[id]` | `updatePurchaseOrderSchema` | Edit draft / submit / cancel |
| POST | `/api/purchase-orders/[id]/receive` | `receivePurchaseOrderSchema` | **Receive stock** → inventory `receive` movement + blended cost + supplier price history; closes PO when complete |

Pack conversion: suppliers sell in packs; `receivedBaseQuantity` and
`costPerBaseUnit` convert to base units, `blendedUnitCost` weights new stock
against on-hand. Historical `recipe_cost_snapshots` are never touched.

## Recipes & cost (Stage 6 — schemas/engine ready; routes pending apply)

Planned: `GET/POST /api/recipes`, `GET/PATCH /api/recipes/[id]`,
`POST /api/recipes/[id]/version`, `POST /api/menu/[id]/recipe`,
`GET /api/menu/[id]/cost`, `GET /api/costs/overview`. The costing math
(`computeMenuItemCosting`) and Zod schemas already exist and are tested.
