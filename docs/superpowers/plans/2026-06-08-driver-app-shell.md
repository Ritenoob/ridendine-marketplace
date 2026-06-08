# Driver App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Driver app a shared desktop/PWA shell comparable to Chef and Ops without changing driver business logic.

**Architecture:** Add app-specific Driver layout components under `apps/driver-app/src/components/layout/`, backed by one shared nav definition. Wrap protected Driver pages in the shell and remove duplicated headers/bottom navs from page content.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Jest, `@ridendine/ui`, `@ridendine/auth`, `lucide-react`.

---

## File Structure

- Create `apps/driver-app/src/components/layout/driver-nav.tsx`: canonical Driver nav definitions and active-route helper.
- Create `apps/driver-app/src/components/layout/driver-sidebar.tsx`: desktop sidebar/rail.
- Create `apps/driver-app/src/components/layout/driver-bottom-nav.tsx`: PWA/mobile bottom tabs.
- Create `apps/driver-app/src/components/layout/driver-topbar.tsx`: sticky top bar with title, driver badge, and sign-out action.
- Create `apps/driver-app/src/components/layout/driver-shell.tsx`: shared shell that composes sidebar, topbar, bottom nav, and content frame.
- Create `apps/driver-app/src/__tests__/driver-shell.test.tsx`: shell and nav behavior tests.
- Modify `apps/driver-app/package.json`: declare `lucide-react`.
- Modify `pnpm-lock.yaml`: add `lucide-react` to the Driver importer.
- Modify Driver pages to wrap content with `DriverShell`: `app/page.tsx`, `app/earnings/page.tsx`, `app/history/page.tsx`, `app/profile/page.tsx`, `app/settings/page.tsx`, `app/delivery/[id]/page.tsx`.
- Modify Driver page content components to remove duplicated app chrome: `DriverDashboard.tsx`, `EarningsView.tsx`, `HistoryView.tsx`, `ProfileView.tsx`, `settings-client.tsx`.

---

### Task 1: Add Driver Shell Tests

**Files:**
- Create: `apps/driver-app/src/__tests__/driver-shell.test.tsx`

- [ ] **Step 1: Write tests for shared nav and shell rendering**

```tsx
/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DRIVER_NAV_ITEMS, isDriverNavActive } from '@/components/layout/driver-nav';
import { DriverShell } from '@/components/layout/driver-shell';

const push = jest.fn();
let pathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

jest.mock('next/link', () => {
  const Link = ({ children, href, className, ...props }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => ({
    user: { email: 'sean@ridendine.ca', user_metadata: { display_name: 'Sean' } },
    signOut: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('DriverShell', () => {
  beforeEach(() => {
    pathname = '/';
    push.mockClear();
  });

  it('defines the expected Driver destinations once', () => {
    expect(DRIVER_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/history',
      '/earnings',
      '/profile',
      '/settings',
    ]);
  });

  it('marks root active only at the root path', () => {
    const root = DRIVER_NAV_ITEMS[0];
    const earnings = DRIVER_NAV_ITEMS.find((item) => item.href === '/earnings');

    expect(isDriverNavActive('/', root)).toBe(true);
    expect(isDriverNavActive('/earnings', root)).toBe(false);
    expect(earnings ? isDriverNavActive('/earnings/payouts', earnings) : false).toBe(true);
  });

  it('renders desktop and mobile navigation from the same nav source', () => {
    pathname = '/earnings';

    render(
      <DriverShell title="Earnings">
        <p>Driver earnings content</p>
      </DriverShell>
    );

    expect(screen.getByRole('heading', { name: 'Earnings' })).toBeInTheDocument();
    expect(screen.getByText('Driver earnings content')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /earnings/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails before implementation**

Run: `pnpm --filter @ridendine/driver-app test -- driver-shell.test.tsx --runInBand`

Expected: FAIL because `@/components/layout/driver-nav` and `@/components/layout/driver-shell` do not exist yet.

---

### Task 2: Create Driver Layout Components

**Files:**
- Create: `apps/driver-app/src/components/layout/driver-nav.tsx`
- Create: `apps/driver-app/src/components/layout/driver-sidebar.tsx`
- Create: `apps/driver-app/src/components/layout/driver-bottom-nav.tsx`
- Create: `apps/driver-app/src/components/layout/driver-topbar.tsx`
- Create: `apps/driver-app/src/components/layout/driver-shell.tsx`
- Modify: `apps/driver-app/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add `lucide-react` to Driver dependencies**

Add this dependency to `apps/driver-app/package.json`:

```json
"lucide-react": "^0.454.0"
```

Add the same importer entry in `pnpm-lock.yaml` under `apps/driver-app.dependencies`:

```yaml
      lucide-react:
        specifier: ^0.454.0
        version: 0.454.0(react@18.3.1)
```

- [ ] **Step 2: Implement the shared nav model**

Create `driver-nav.tsx` with nav items for Work Dashboard, History, Earnings, Profile, and Settings. Use route matching that treats `/` as exact and nested paths as active for non-root destinations.

- [ ] **Step 3: Implement desktop sidebar**

Create a desktop-only sidebar that uses `Logo`, route-aware active styles, and `Link`. It should be visible from `md` upward and hidden on mobile/PWA.

- [ ] **Step 4: Implement mobile bottom nav**

Create a fixed bottom nav visible below `md`, using the same nav items, active states, and `safe-bottom`.

- [ ] **Step 5: Implement topbar and shell**

Create a sticky topbar with the page title, optional subtitle/status text, a Driver badge, user email/name, and sign-out action. Compose sidebar/topbar/bottom nav in `DriverShell`.

- [ ] **Step 6: Run the focused shell test**

Run: `pnpm --filter @ridendine/driver-app test -- driver-shell.test.tsx --runInBand`

Expected: PASS.

---

### Task 3: Wrap Driver Pages In The Shared Shell

**Files:**
- Modify: `apps/driver-app/src/app/page.tsx`
- Modify: `apps/driver-app/src/app/earnings/page.tsx`
- Modify: `apps/driver-app/src/app/history/page.tsx`
- Modify: `apps/driver-app/src/app/profile/page.tsx`
- Modify: `apps/driver-app/src/app/settings/page.tsx`
- Modify: `apps/driver-app/src/app/delivery/[id]/page.tsx`

- [ ] **Step 1: Wrap dashboard**

Wrap `<DriverDashboard />` in `<DriverShell title="Work Dashboard" subtitle="Shift, offers, readiness, and active deliveries" />`.

- [ ] **Step 2: Wrap secondary pages**

Wrap Earnings, History, Profile, and Settings page content with `DriverShell` and matching titles/subtitles.

- [ ] **Step 3: Wrap delivery detail without mobile bottom nav**

Wrap `DeliveryDetail` with `DriverShell title="Active Delivery" showBottomNav={false} fullBleed`, so the delivery workflow keeps its fixed completion action without colliding with the app tab bar.

---

### Task 4: Remove Duplicated Page Chrome

**Files:**
- Modify: `apps/driver-app/src/app/components/DriverDashboard.tsx`
- Modify: `apps/driver-app/src/app/earnings/components/EarningsView.tsx`
- Modify: `apps/driver-app/src/app/history/components/HistoryView.tsx`
- Modify: `apps/driver-app/src/app/profile/components/ProfileView.tsx`
- Modify: `apps/driver-app/src/app/settings/settings-client.tsx`

- [ ] **Step 1: Remove dashboard-owned header/nav**

Delete local `NAV_ITEMS`, logo/header/sign-out UI, bottom nav, and now-unused imports/state from `DriverDashboard`.

- [ ] **Step 2: Remove copied bottom navs from secondary pages**

Delete the duplicated bottom nav arrays from Earnings, History, Profile, and Settings content components.

- [ ] **Step 3: Remove duplicated page headers**

Remove page-level brand headers from Earnings, History, Profile, and Settings because the shell now owns app-level titles.

- [ ] **Step 4: Preserve business content**

Keep all existing content sections, API calls, forms, payout controls, notification preferences, active delivery cards, offer alert wiring, and shift controls unchanged.

---

### Task 5: Verify And Commit Phase 1

**Files:**
- All files modified above.

- [ ] **Step 1: Run Driver tests**

Run: `pnpm --filter @ridendine/driver-app test -- --runInBand`

Expected: PASS, or document exact failing tests and cause.

- [ ] **Step 2: Run Driver typecheck**

Run: `pnpm --filter @ridendine/driver-app typecheck`

Expected: PASS.

- [ ] **Step 3: Run Driver build**

Run: `pnpm --filter @ridendine/driver-app build`

Expected: PASS.

- [ ] **Step 4: Browser verify**

Run the Driver app locally and inspect desktop and mobile/PWA-sized layouts. Confirm desktop shows sidebar, mobile shows bottom tabs, and delivery detail has no app bottom tab collision.

- [ ] **Step 5: Commit and push**

Commit only Phase 1 files, leaving unrelated untracked graphify output untouched. Push to the configured GitHub remote.

---

## Self-Review

- Spec coverage: covered shared shell, desktop sidebar, PWA bottom tabs, duplicated nav removal, page integration, delivery fixed-action collision, tests, and verification.
- Placeholder scan: no placeholder tasks remain.
- Type consistency: the plan consistently uses `DriverShell`, `DRIVER_NAV_ITEMS`, and `isDriverNavActive`.
