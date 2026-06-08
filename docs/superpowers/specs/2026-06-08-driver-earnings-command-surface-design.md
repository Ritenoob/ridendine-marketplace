# Driver Earnings Command Surface Phase 3 Design

## Goal

Upgrade the Driver Earnings page from a basic stacked payout view into an operational finance command surface that matches the Phase 1 shell and Phase 2 dashboard patterns.

## Scope

Phase 3 changes the Driver earnings UI only. It does not change payout setup, instant payout request APIs, ledger calculations, Stripe execution, delivery history queries, or Ops finance tooling.

## Design

The earnings screen should help a driver quickly answer four questions:

- What can I request now?
- What is held by pending instant payout requests and fees?
- Is my payout account ready?
- What deliveries and earning components produced this balance?

The top of the page becomes a compact command band with available-now balance, weekly earnings, completed deliveries, and pending holds. Under that, a two-column desktop layout separates finance controls from activity proof:

- Left column: payout readiness, available balance, pending instant payout requests, and instant payout form.
- Right column: weekly activity, today's deliveries, and delivery pay breakdown.

On mobile/PWA, sections stack in priority order: command band, payout readiness, available balance, instant payout action, pending holds, weekly activity, deliveries, breakdown.

## Data Flow

`EarningsView` continues to receive all data from `apps/driver-app/src/app/earnings/page.tsx`:

- Completed deliveries from `getDeliveryHistory`.
- Ledger available balance from `platform_accounts`.
- Pending instant payout requests from `instant_payout_requests`.
- Driver payout account status from `driver_payout_accounts`.
- `instantPayoutsEnabled` from the driver profile.

No new fetches are added except the existing instant payout POST when the driver submits a request.

## UI Requirements

- Display `Earnings command center` as the page-level surface heading.
- Display `Available now`, `Weekly earnings`, `Completed this week`, and `Pending holds` KPI labels.
- Display `Payout readiness` with account status, payout enabled state, and instant payout availability.
- Keep the `Amount (CAD)` style currency label dynamic.
- Keep the instant payout fee preview and validation behavior.
- Keep the existing delivery pay breakdown copy that explains fallback estimates.
- Keep pending instant payout request details visible when requests exist.

## Error Handling

Client-side validation remains unchanged:

- Invalid amounts show `Enter a valid dollar amount.`
- Amounts above net available after holds and fees show the existing over-balance message.
- Failed API requests show the returned error message or `Request failed`.
- Network errors show `Network error`.

## Acceptance Criteria

- Earnings page uses a command-surface structure consistent with the driver dashboard.
- Existing earnings tests continue to pass.
- New tests prove the command heading, KPI labels, payout readiness, and pending hold summary render.
- Typecheck, lint, full driver tests, and driver build pass.
- Phase 3 is committed, pushed to GitHub, and Vercel driver deployment is ready for the pushed commit.
