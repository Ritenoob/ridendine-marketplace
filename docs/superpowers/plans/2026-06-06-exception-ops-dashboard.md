# Ops Exception Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Ops Exceptions dashboard that makes ownership, SLA risk, and escalation state visible from existing exception data.

**Architecture:** A pure model converts `order_exceptions` rows into display-ready queue items and summary counts. A server-rendered Ops page reads existing exception, alert, and support-ticket data with the admin client, gates access with `exceptions_read`, and renders the queue without mutating workflow state.

**Tech Stack:** Next.js App Router, React server components, Supabase admin client, TypeScript, Jest-style unit tests already used in ops-admin.

---

## File Structure

- Create: `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts`
- Create: `apps/ops-admin/src/app/dashboard/exceptions/__tests__/exception-queue-model.test.ts`
- Create: `apps/ops-admin/src/app/dashboard/exceptions/page.tsx`
- Modify: `apps/ops-admin/src/components/DashboardLayout.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/_components/control-center-model.ts`
- Modify: `apps/ops-admin/src/app/dashboard/_components/__tests__/control-center.test.ts`
- Modify vault note: `06 - Product and Technology/App Architecture/15 - Phased Improvement Execution Plan.md`

## Task 1: Exception Queue Model

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts`
- Test: `apps/ops-admin/src/app/dashboard/exceptions/__tests__/exception-queue-model.test.ts`

- [ ] **Step 1: Write failing model tests**

Cover these behaviors:

```ts
import {
  buildExceptionQueue,
  formatExceptionLabel,
  getExceptionSlaState,
  getExceptionTone,
  type ExceptionQueueRow,
} from '../exception-queue-model';

const now = new Date('2026-06-06T12:00:00Z');

function row(overrides: Partial<ExceptionQueueRow>): ExceptionQueueRow {
  return {
    id: 'ex_1',
    exception_type: 'no_driver_available',
    severity: 'medium',
    status: 'open',
    title: 'No driver available',
    description: 'Dispatch needs help.',
    recommended_actions: ['Manual assignment'],
    order_id: 'order_1',
    customer_id: null,
    chef_id: null,
    driver_id: null,
    delivery_id: null,
    assigned_to: null,
    sla_deadline: null,
    escalated_at: null,
    created_at: '2026-06-06T11:00:00Z',
    updated_at: '2026-06-06T11:00:00Z',
    orders: { order_number: 'RD-1', status: 'dispatch_pending' },
    ...overrides,
  };
}

describe('exception queue model', () => {
  it('sorts critical and escalated exceptions first', () => {
    const queue = buildExceptionQueue([
      row({ id: 'medium', severity: 'medium', created_at: '2026-06-06T10:00:00Z' }),
      row({ id: 'critical', severity: 'critical', created_at: '2026-06-06T11:00:00Z' }),
      row({ id: 'escalated', status: 'escalated', severity: 'high', created_at: '2026-06-06T11:30:00Z' }),
    ], { now });

    expect(queue.reviewQueue.map((item) => item.id)).toEqual(['critical', 'escalated', 'medium']);
    expect(queue.summary.totalOpen).toBe(3);
    expect(queue.summary.criticalOrHigh).toBe(2);
  });

  it('tracks unassigned and waiting-on-participant buckets', () => {
    const queue = buildExceptionQueue([
      row({ id: 'unassigned', assigned_to: null }),
      row({ id: 'customer', status: 'pending_customer', assigned_to: 'ops_1' }),
    ], { now });

    expect(queue.summary.unassigned).toBe(1);
    expect(queue.summary.waitingOnParticipant).toBe(1);
    expect(queue.reviewQueue[1]?.ownerLabel).toBe('Owned');
  });

  it('computes SLA states', () => {
    expect(getExceptionSlaState(null, now).state).toBe('none');
    expect(getExceptionSlaState('2026-06-06T11:59:00Z', now).state).toBe('breached');
    expect(getExceptionSlaState('2026-06-06T12:10:00Z', now).state).toBe('at_risk');
    expect(getExceptionSlaState('2026-06-06T13:00:00Z', now).state).toBe('on_track');
  });

  it('formats labels and tones', () => {
    expect(formatExceptionLabel('driver_late_pickup')).toBe('Driver Late Pickup');
    expect(getExceptionTone('critical')).toBe('danger');
    expect(getExceptionTone('medium')).toBe('warning');
    expect(getExceptionTone('low')).toBe('info');
  });
});
```

- [ ] **Step 2: Run focused test**

Run:

```powershell
pnpm --filter @ridendine/ops-admin test -- exception-queue-model
```

Expected locally in this environment: blocked because `pnpm` is not installed. In a normal project toolchain, the first run should fail because the model file does not exist.

- [ ] **Step 3: Implement the model**

Create types and functions:

```ts
export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ExceptionStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'pending_customer'
  | 'pending_chef'
  | 'pending_driver'
  | 'resolved'
  | 'closed'
  | 'escalated';
export type ExceptionSlaState = 'none' | 'on_track' | 'at_risk' | 'breached';
export type ExceptionTone = 'danger' | 'warning' | 'info' | 'success' | 'idle';

export interface ExceptionQueueRow {
  id: string;
  exception_type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  title: string;
  description: string | null;
  recommended_actions: string[] | null;
  order_id: string | null;
  customer_id: string | null;
  chef_id: string | null;
  driver_id: string | null;
  delivery_id: string | null;
  assigned_to: string | null;
  sla_deadline: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
  orders?: { order_number: string | null; status: string | null } | null;
}
```

The implementation should compute SLA minutes, age labels, owner labels, primary action, summary totals, and sorted `reviewQueue`.

- [ ] **Step 4: Re-run focused test**

Run the same focused test command and record whether it passes or is blocked locally.

## Task 2: Read-Only Exceptions Page

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/exceptions/page.tsx`

- [ ] **Step 1: Add server data reads**

The page should:

- call `getOpsActorContext()`
- require `hasPlatformApiCapability(actor, 'exceptions_read')`
- read open `order_exceptions` with nested `orders`
- read active `system_alerts` where `acknowledged = false`
- read open/in-progress `support_tickets`
- call `buildExceptionQueue(rows, { now: new Date(), activeAlertCount, openTicketCount })`

- [ ] **Step 2: Render summary and queue**

Render:

- Page header: `Exceptions`
- Summary cards: open, critical/high, unassigned, breached SLA, escalated
- Filter chips as links with query param `filter`
- Queue rows with severity/status badges, owner state, SLA state, related order link, age, and primary action
- Side rail with active alerts and open support ticket count

- [ ] **Step 3: Keep empty and error states explicit**

If access is denied, render an access-restricted card. If the data read fails, render a data-unavailable card with the error message. If no exceptions match, render a quiet empty state.

## Task 3: Ops Wiring

**Files:**
- Modify: `apps/ops-admin/src/components/DashboardLayout.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/_components/control-center-model.ts`
- Modify: `apps/ops-admin/src/app/dashboard/_components/__tests__/control-center.test.ts`

- [ ] **Step 1: Add navigation**

Add `/dashboard/exceptions` under the Operate group with a `Siren` or `AlertTriangle` lucide icon.

- [ ] **Step 2: Add control-center domain**

Add an `exceptions` area with:

- href `/dashboard/exceptions`
- APIs `/api/engine/exceptions`, `/api/engine/exceptions/[id]`, `/api/engine/dashboard`
- signals `Open exceptions`, `SLA breach`, `Unassigned`, `Escalated`
- actions `Open order`, `Open support`, `Review SLA`, `Acknowledge later slice`

Update the test to expect 14 domains and include `exceptions` after `engine-health`.

## Task 4: Documentation, Verification, And Release

**Files:**
- Modify vault note `15 - Phased Improvement Execution Plan.md`
- Regenerate vault note `14 - Generated Live Inventory Snapshot.md`

- [ ] **Step 1: Update vault notes**

Record Phase 5 slice as read-only exception visibility and list exact sources:

- `order_exceptions`
- `system_alerts`
- `support_tickets`
- existing exception APIs

- [ ] **Step 2: Run available verification**

Run:

```powershell
git diff --check
pnpm --filter @ridendine/ops-admin test -- exception-queue-model
.\scripts\docs\generate-obsidian-architecture.ps1
git status --short
```

Expected locally: `git diff --check` and the docs generator should succeed; the focused test remains blocked until `pnpm` is installed.

- [ ] **Step 3: Commit and push**

Commit message:

```text
feat(ops-admin): add exception queue dashboard
```

Push to `origin master`, then check the four Vercel production projects for commit readiness.
