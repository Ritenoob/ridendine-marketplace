# Driver Command Center Phase 2 Design

## Goal

Upgrade the Driver home screen from a set of basic cards into an operating command center that works inside the Phase 1 shared shell.

## Scope

Phase 2 changes the Driver home/dashboard experience only. It does not change delivery dispatch logic, offer response logic, earnings ledger logic, payout setup, proof upload, or Ops APIs.

## Design

The command center should show the driver what matters before and during a shift:

- Shift command area: on/off shift status, start/end shift action, live shift duration, and blocker messaging.
- Work queue: active delivery first, then pending offers from the existing `/api/offers` endpoint.
- Readiness and GPS: approval, dispatch readiness, GPS freshness, compliance open items, and retry location when needed.
- Earnings snapshot: today deliveries, today earnings, shift distance when present, and estimated hours from shift start.
- Quick actions: links to Earnings and History remain, but appear secondary to the operating state.

## Data Flow

`DriverDashboard` will continue hydrating from:

- `/api/driver/presence`
- `/api/earnings`
- `/api/driver/readiness`
- `/api/driver/shift`

It will also call:

- `/api/offers`

Pending offers are read-only in Phase 2. The existing `OfferAlert` keeps handling real-time offer acceptance/decline behavior. The persistent offer queue gives the driver context if a broadcast was missed, if the modal was dismissed, or if they reload while pending offers exist.

## UI Requirements

Desktop:

- Use a two-column layout under the shared Driver shell.
- Left column focuses on shift/readiness/active work.
- Right column shows pending offers, earnings snapshot, and quick actions.

PWA/mobile:

- Stack sections in priority order: shift, active work, offers, readiness, earnings, quick actions.
- Keep controls thumb-friendly and avoid conflicting with the shared bottom tab bar.

## Error Handling

If the offer queue fails to load, show a quiet message in the work queue panel and keep the rest of the dashboard usable. Existing shift and readiness error handling remains.

## Acceptance Criteria

- The Driver home screen has a clear command-center layout.
- Shift duration displays from `shiftStartedAt` while on shift.
- Pending offers from `/api/offers` are visible without relying only on the modal alert.
- Existing start/end shift behavior still works.
- Existing active delivery workflow link still works.
- Existing dashboard tests pass, and new tests cover shift duration and pending offer queue behavior.
