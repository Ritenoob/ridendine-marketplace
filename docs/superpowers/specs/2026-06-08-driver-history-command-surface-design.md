# Driver History Command Surface Design

## Goal

Upgrade the Driver History page from a basic completed-delivery list into a delivery ledger that matches the Driver shell, dashboard, and earnings command surfaces.

## Scope

This phase changes only the Driver History presentation layer. It does not add new APIs, mutate delivery state, change earnings ledger behavior, or alter Ops visibility. The existing `getDeliveryHistory()` loader remains the source of truth.

## Design

The page should help a driver answer four questions quickly:

- How much completed work is in this history view?
- What did that work earn?
- How much distance did it cover?
- Which completed deliveries prove the totals?

The top of the page becomes a command surface with KPI panels for completed deliveries, total earned, average payout, and total distance. Below that, the page shows a proof-oriented ledger section with the most recent completed delivery and the existing date-grouped delivery history.

Each delivery row should show:

- Pickup and dropoff context.
- Completed time.
- Distance.
- Driver payout.
- Current delivery status badge.

## Data Flow

`apps/driver-app/src/app/history/page.tsx` already loads completed deliveries through `getDeliveryHistory(supabase, driver.id, { limit: 50 })` and passes them into `HistoryView`. Phase 4 keeps that contract unchanged and computes presentation-only summaries inside `HistoryView`.

## Empty State

When there are no completed deliveries, the page should still look intentional inside the command surface. It should show zeroed KPIs and a clear empty ledger message.

## Error Handling

No new async behavior is introduced in this phase. The existing page loader continues to handle unauthenticated users and missing driver profiles.

## Acceptance Criteria

- The History page renders `Delivery history command center`.
- KPI labels include `Completed deliveries`, `Total earned`, `Average payout`, and `Total distance`.
- The page shows a `Delivery proof trail` section.
- Completed delivery rows preserve date grouping, status badges, completed time, distance, and payout.
- Empty history renders zeroed metrics and a clear no-history message.
- Focused History tests, full Driver tests, typecheck, lint, and build pass.
