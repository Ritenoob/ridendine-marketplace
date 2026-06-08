# Driver Profile And Settings Command Surface Design

## Goal

Upgrade Driver Profile and Driver Settings so they match the newer Driver shell, dashboard, earnings, and history command surfaces.

## Scope

This phase changes Driver Profile and Settings presentation only. It preserves:

- `PATCH /api/driver` profile updates.
- `POST /api/payouts/setup` payout onboarding.
- Instant payout preference updates through `PATCH /api/driver`.
- DB-backed notification preferences through `/api/driver/notification-preferences`.
- Existing Driver shell routes and navigation.

No new routes, tables, or Supabase queries are introduced.

## Design

Profile becomes a driver account command center. It should show:

- A top command heading.
- Driver status, contact readiness, vehicle readiness, and payout setup summary.
- Editable driver information.
- Vehicle details.
- Payout account setup or status.

Settings becomes a driver controls command center. It should show:

- A top command heading.
- Payable balance, instant payout access, notification sync state, and account controls.
- The existing instant payout toggle.
- A clear Earnings link.
- The existing notification preferences table.

Both pages should use tokenized Driver design classes (`text-text`, `text-textMuted`, `bg-surface`, `bg-surfaceMuted`, `border-divider`, `text-success`, etc.) instead of raw Tailwind palette classes.

## Data Flow

`ProfileView` continues to receive `driver` from `apps/driver-app/src/app/profile/page.tsx` and continues to load payout-account status through the existing browser Supabase query.

`SettingsClient` continues to receive `driver`, `balanceCents`, and `currency` from `apps/driver-app/src/app/settings/page.tsx`. It continues to call `PATCH /api/driver` when the instant payout toggle changes and leaves `NotificationPreferences` as the owner of notification preference loading/saving.

## Empty And Loading States

Profile keeps the payout account loading skeleton and shows connected, restricted, pending, or setup-needed states.

Settings keeps local save feedback for instant payout preference changes and keeps notification preference loading/saving messages.

## Acceptance Criteria

- Profile renders `Driver profile command center`.
- Profile shows KPI labels for `Driver status`, `Contact record`, `Vehicle record`, and `Payout setup`.
- Profile preserves edit/save/cancel behavior for first name, last name, and phone.
- Settings renders `Driver settings command center`.
- Settings shows KPI labels for `Payable balance`, `Instant payouts`, `Notification sync`, and `Account controls`.
- Settings preserves instant payout toggle behavior and the Earnings link.
- Focused Profile and Settings tests, full Driver tests, typecheck, lint, and build pass.
