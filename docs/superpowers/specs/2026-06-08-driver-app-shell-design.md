# Driver App Shell Phase 1 Design

## Goal

Bring the Driver app layout up to the same operational standard as the Chef and Ops apps while keeping the existing driver business logic intact.

## Scope

Phase 1 creates a shared Driver shell that works on desktop and installed PWA/mobile views. It centralizes navigation, app identity, account actions, and page framing so Dashboard, Earnings, History, Profile, Settings, and Delivery pages no longer each carry their own one-off header or bottom navigation.

This phase does not change the delivery engine, shift API, offer API, earnings API, payout API, proof upload flow, location tracking, or Ops dispatch wiring. Those features stay wired as they are and are only re-framed inside a stronger layout.

## Current Problem

The Driver app has useful functionality but it is assembled page by page. The dashboard defines its own navigation, Earnings/History/Profile copy similar navigation, Settings uses a different text-only nav, and Delivery has its own fixed action area. Chef and Ops both use shared layout components, which makes them feel like cohesive applications. Driver needs the same structure, adjusted for drivers who use both desktop review screens and phone/PWA field workflows.

## Layout Design

Create a shared Driver shell with:

- A desktop layout with a left navigation rail/sidebar, app identity, role badge, driver status area, and account/sign-out action.
- A mobile/PWA layout with a compact top bar and persistent bottom tab bar.
- A single shared navigation definition used by every protected Driver page.
- Route-aware active states through `usePathname`.
- Safe-area support for PWA bottom navigation.
- A constrained main content area for desktop pages while preserving full-width mobile workflows.

The shell should include these primary destinations:

- Home: `/`
- Work: `/work` or equivalent current dashboard/work surface if this phase does not add a new route
- History: `/history`
- Earnings: `/earnings`
- Profile: `/profile`
- Settings: `/settings`

If a new Work route would require extra product behavior, Phase 1 should not add it. Instead, the shell should reserve the nav model for Work and keep Home as the current work dashboard until the offer queue phase.

## Component Boundaries

Create focused layout components under `apps/driver-app/src/components/layout/`:

- `driver-nav.ts`: shared nav item definitions and route matching helpers.
- `driver-shell.tsx`: top-level shell used by protected Driver pages.
- `driver-bottom-nav.tsx`: mobile/PWA bottom tab bar.
- `driver-sidebar.tsx`: desktop navigation rail/sidebar.
- `driver-topbar.tsx`: mobile and desktop header/status/account bar where needed.

The page components should stop rendering duplicated app-level headers and navs. Their responsibility should become only the page content.

## Page Integration

Update these pages/components:

- Dashboard: remove local header and bottom nav from `DriverDashboard`; keep readiness, shift, stats, active delivery, and empty states.
- Earnings: remove local header and bottom nav; render the earnings content inside the shared shell.
- History: remove local header and bottom nav; render history summary/content inside the shared shell.
- Profile: remove local header and bottom nav; keep settings link and profile form inside the shared shell.
- Settings: remove local header and text-only nav; make it a normal Driver settings page inside the shared shell.
- Delivery detail: keep the delivery workflow full-screen enough for field use, but make the header/back/account behavior consistent. Do not break the fixed bottom delivery action.

## Desktop And PWA Requirements

Desktop:

- Display a left navigation shell similar in discipline to Chef/Ops.
- Keep content readable with a max-width container where appropriate.
- Do not rely on bottom navigation as the only route control.

PWA/mobile:

- Preserve thumb-friendly bottom tab navigation.
- Respect `safe-area-inset-bottom`.
- Keep active delivery actions fixed and reachable.
- Avoid content hidden behind fixed bottom controls.

## Error Handling

This phase should not redesign every error state. It should avoid introducing new browser alerts or new unhandled states. Existing page-level loading and error behavior can remain unless a duplicated header/nav removal requires a small adjustment.

## Testing

Add or update tests to prove:

- The shared nav renders all expected destinations.
- Active states follow the current pathname.
- Dashboard no longer owns app-level bottom navigation.
- Earnings, History, Profile, and Settings render inside the shared shell.
- Mobile bottom nav and desktop sidebar can both render from the same nav source.

Run the Driver app test suite and at least one build/typecheck command available in the repo. If a local dev server is practical, verify the Driver app in browser at desktop and mobile-sized viewports.

## Acceptance Criteria

- Driver app has a cohesive shared shell comparable to Chef/Ops.
- Desktop users get sidebar/rail navigation.
- PWA/mobile users keep bottom tab navigation.
- Duplicate per-page nav definitions are removed.
- Existing driver features still work: shift, readiness, active delivery, offers alert, earnings, payout settings, profile, history.
- Tests pass or any remaining failures are documented with exact cause.
