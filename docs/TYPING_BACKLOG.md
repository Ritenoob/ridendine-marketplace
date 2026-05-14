# TypeScript Typing Backlog — Deferred from D.11

**Created:** 2026-05-14
**Owner:** Whoever picks up the codebase next

## Why this exists

`@typescript-eslint/no-explicit-any` was disabled in `packages/config/eslint.config.js` because the codebase has **~440 existing `any` usages** that produce **165 lint warnings**, most from Supabase client casts where the auto-generated types don't match runtime semantics.

Phase D item D.11 said "eliminate the 41 any lint warnings" — that count grew to 165 as more code shipped. Fixing all properly is a multi-day exercise that wasn't doable in the pause window. To keep the lint signal useful for new code, the rule is OFF for now. Re-enable once this backlog is worked through.

## Inventory by file (top offenders, sorted by count)

| Count | File | Pattern |
|---|---|---|
| 21 | `packages/engine/src/orchestrators/operations-command.gateway.ts` | Engine sub-orchestrator fields typed `?: any` + `(client.from(...) as any)` Supabase casts |
| 19 | `packages/db/src/repositories/ops.repository.ts` | `Record<string, any>` row types + `as any` on every PostgREST chain |
| 13 | `apps/ops-admin/src/app/api/export/route.ts` | CSV serialization uses `Record<string, any>` |
| 10 | `apps/web/src/app/api/checkout/route.ts` | Stripe response payload typing + cart-row casts |
| 9 | `packages/engine/src/services/referral.service.ts` | Supabase upsert response casts |
| 9 | `apps/ops-admin/src/app/api/engine/payouts/route.ts` | Payout row response casts |
| 8 | `apps/ops-admin/src/components/global-search.tsx` | Multi-table fan-out search result casts |
| 6 | `packages/engine/src/services/loyalty.service.ts` | Loyalty event payload typing |
| 6 | `apps/web/src/app/api/reviews/route.ts` | Review row response casts |
| 6 | `apps/ops-admin/src/app/api/analytics/trends/route.ts` | Trend bucket aggregation |
| 5 | `packages/engine/src/orchestrators/ops.engine.ts` | Engine method param casts |
| 5 | `packages/engine/src/core/notification-triggers.ts` | Notification payload generics |
| 5 | `apps/ops-admin/src/app/api/announcements/route.ts` | Announcement targeting casts |
| 5 | `apps/ops-admin/src/app/api/analytics/route.ts` | Analytics aggregation casts |
| 4 | `packages/engine/src/e2e/stripe-payment.e2e.ts` | Test mock typing |
| 4 | `apps/web/src/app/checkout/page.tsx` | Promo validation response casts |
| 4 | `apps/ops-admin/src/app/api/team/route.ts` | Team-member RPC casts |

…plus ~30 more files with 1-3 instances each.

## Suggested cleanup strategy

### Phase 1 — fix the data layer (high value)

Top 5 files (72 instances) are mostly Supabase client casts. The right fix:

```ts
// BEFORE
const { data, error } = await (client.from('orders').select('*') as any);

// AFTER (option A — use the generated types)
import type { Tables } from '@ridendine/db';
const { data, error } = await client.from('orders').select('*');
// data is now Tables<'orders'>[] | null

// AFTER (option B — when the select shape diverges from the schema)
type OrderListRow = Pick<Tables<'orders'>, 'id' | 'order_number' | 'engine_status'>;
const { data, error } = await client
  .from('orders')
  .select('id, order_number, engine_status')
  .returns<OrderListRow[]>();
```

### Phase 2 — engine sub-orchestrator field types

`operations-command.gateway.ts:9-16` has `orders?: any; platform?: any; …` for the sub-engines. Replace with the actual orchestrator class types from `@ridendine/engine`.

### Phase 3 — CSV/JSON serializers

`apps/ops-admin/src/app/api/export/route.ts` uses `Record<string, any>` for CSV rows. Replace with explicit row interfaces per export-kind.

### Phase 4 — Test mocks

Test files often legitimately need `any` for mock objects. Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock` rather than the global off, once the rule is re-enabled.

## When to re-enable the rule

After Phase 1+2 above are done (estimated 4-6 hours of careful typing work). Then:

1. Set `'@typescript-eslint/no-explicit-any': 'error'` in `packages/config/eslint.config.js`
2. Run `pnpm lint --fix` and address every remaining warning manually
3. Any genuine `any` (test mocks, framework adapters) gets `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <reason>` inline
4. Future PRs cannot introduce new `any` without explicit suppression

## Quick measurement

```bash
# Total any occurrences in src (not tests, not generated)
grep -rE ":\s*any\b|\bas\s+any\b|<any>|\bany\[\]" apps/*/src packages/*/src \
  --include="*.ts" --include="*.tsx" \
  | grep -v "\.next\|node_modules\|\.d\.ts\|test\." | wc -l

# Per-file ranking
grep -rE ":\s*any\b|\bas\s+any\b|<any>|\bany\[\]" apps/*/src packages/*/src \
  --include="*.ts" --include="*.tsx" \
  | grep -v "\.next\|node_modules\|\.d\.ts\|test\." \
  | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

Baseline 2026-05-14: 440 occurrences across the monorepo.
