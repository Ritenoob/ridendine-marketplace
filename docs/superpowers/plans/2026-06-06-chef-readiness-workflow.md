# Chef Readiness Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chef-facing kitchen workflow clarity to live order cards without changing order APIs, schema, or engine state transitions.

**Architecture:** Keep the change inside `apps/chef-admin`. `OrdersList` derives summary counts and per-order workflow state from existing order fields, then still sends the same protected action payloads through `PATCH /api/orders/[id]`. Tests cover the new component behavior and preserve smoke wiring.

**Tech Stack:** Next.js App Router, React 18, Jest, Testing Library, Tailwind classes, existing `@ridendine/ui` Card/Badge/Button/LiveIndicator components, existing chef order API.

---

## File Structure

- Create `apps/chef-admin/src/__tests__/orders-list-readiness.test.tsx`
  - Component tests for the kitchen workflow summary, order workflow panel, and mark-ready payload.
- Modify `apps/chef-admin/src/components/orders/orders-list.tsx`
  - Add readable status labels, workflow metadata, summary metrics, and per-order kitchen step UI.
- Modify `apps/chef-admin/src/__tests__/platform-smoke.test.ts`
  - Add smoke coverage for the new chef workflow labels.
- Modify `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`
  - Record Phase 6c status, commit evidence, deployment evidence, and local tooling blockers.

---

### Task 1: Add Chef Readiness Component Tests

**Files:**
- Create: `apps/chef-admin/src/__tests__/orders-list-readiness.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `apps/chef-admin/src/__tests__/orders-list-readiness.test.tsx` with:

```tsx
/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrdersList } from '../components/orders/orders-list';

const removeChannelMock = jest.fn();
const subscribeMock = jest.fn((callback?: (status: string) => void) => {
  callback?.('SUBSCRIBED');
  return channelMock;
});
const channelMock = {
  on: jest.fn(() => channelMock),
  subscribe: subscribeMock,
};

jest.mock('next/link', () => {
  const Link = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
  LiveIndicator: ({ status }: { status: string }) => <span data-testid="live-indicator">{status}</span>,
}));

jest.mock('@ridendine/db', () => ({
  chefStorefrontOrdersChannel: (storefrontId: string) => `chef-orders:${storefrontId}`,
  createBrowserClient: () => ({
    channel: jest.fn(() => channelMock),
    removeChannel: removeChannelMock,
  }),
  parseOrdersRealtimeRow: (row: unknown) => row,
}));

const baseOrder = {
  id: 'order-1',
  order_number: 'RD-1001',
  status: 'pending',
  subtotal: 20,
  delivery_fee: 4,
  service_fee: 2,
  tax: 1.5,
  tip: 3,
  total: 30.5,
  payment_status: 'paid',
  estimated_ready_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  actual_ready_at: null,
  special_instructions: null,
  created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  customer: {
    id: 'customer-1',
    first_name: 'Sean',
    last_name: 'Finlay',
    phone: '555-0100',
    email: 'sean@example.com',
  },
  address: {
    id: 'address-1',
    address_line1: '10 King St W',
    city: 'Hamilton',
    state: 'ON',
    postal_code: 'L8P 1A1',
  },
  items: [
    {
      id: 'item-1',
      quantity: 2,
      unit_price: 10,
      total_price: 20,
      menu_item: { id: 'menu-1', name: 'Butter Chicken' },
    },
  ],
  delivery: {
    id: 'delivery-1',
    status: 'assigned',
    driver_id: 'driver-1',
  },
};

describe('OrdersList chef readiness workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows kitchen workflow summary and per-order next action guidance', () => {
    render(
      <OrdersList
        storefrontId="storefront-1"
        initialOrders={[
          baseOrder as any,
          { ...baseOrder, id: 'order-2', order_number: 'RD-1002', status: 'preparing' } as any,
          { ...baseOrder, id: 'order-3', order_number: 'RD-1003', status: 'ready_for_pickup' } as any,
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Kitchen workflow' })).toBeInTheDocument();
    expect(screen.getByText('New decisions')).toBeInTheDocument();
    expect(screen.getByText('In prep')).toBeInTheDocument();
    expect(screen.getByText('Ready for pickup')).toBeInTheDocument();
    expect(screen.getAllByText('Kitchen step').length).toBeGreaterThan(0);
    expect(screen.getByText('Accept or reject')).toBeInTheDocument();
    expect(screen.getAllByText('Next action').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Accept order').length).toBeGreaterThan(0);
    expect(screen.getByText(/review the ticket and accept before the countdown expires/i)).toBeInTheDocument();
    expect(screen.getByText('Pickup handoff')).toBeInTheDocument();
    expect(screen.getAllByText('Waiting for driver').length).toBeGreaterThan(0);
  });

  it('keeps the existing mark_ready API payload and updates the visible workflow state', async () => {
    const preparingOrder = { ...baseOrder, id: 'order-2', order_number: 'RD-1002', status: 'preparing' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          order: {
            ...preparingOrder,
            status: 'ready_for_pickup',
            actual_ready_at: new Date().toISOString(),
          },
        },
      }),
    });

    render(<OrdersList storefrontId="storefront-1" initialOrders={[preparingOrder as any]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Ready' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/orders/order-2',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_ready',
            status: 'ready_for_pickup',
          }),
        })
      );
    });
    expect(await screen.findByText('Pickup handoff')).toBeInTheDocument();
    expect(screen.getAllByText('Waiting for driver').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
pnpm --filter @ridendine/chef-admin test -- orders-list-readiness.test.tsx
```

Expected: test fails because `Kitchen workflow`, `Kitchen step`, and workflow guidance do not exist yet. If local tooling is unavailable, record the exact shell error and continue with implementation.

---

### Task 2: Implement Chef Workflow Summary and Per-Order Guidance

**Files:**
- Modify: `apps/chef-admin/src/components/orders/orders-list.tsx`

- [ ] **Step 1: Add readable status labels and workflow metadata**

Add after `const ACCEPT_TIMEOUT_MS = 8 * 60 * 1000;`:

```tsx
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  delivered: 'Delivered',
};

const KITCHEN_WORKFLOW: Record<
  string,
  { step: string; nextAction: string; focus: string; guidance: string }
> = {
  pending: {
    step: 'Accept or reject',
    nextAction: 'Accept order',
    focus: 'Decision',
    guidance: 'Review the ticket and accept before the countdown expires.',
  },
  accepted: {
    step: 'Prep setup',
    nextAction: 'Start Preparing',
    focus: 'Prep',
    guidance: 'Confirm items, timing, and any special instructions before cooking.',
  },
  preparing: {
    step: 'Kitchen work',
    nextAction: 'Mark Ready',
    focus: 'Cook',
    guidance: 'Finish, package, and mark ready only when the order can be handed to a driver.',
  },
  ready_for_pickup: {
    step: 'Pickup handoff',
    nextAction: 'Waiting for driver',
    focus: 'Handoff',
    guidance: 'Keep the order sealed, staged, and visible for driver pickup.',
  },
};
```

- [ ] **Step 2: Add helper functions below `formatStatus`**

Replace `formatStatus` with:

```tsx
function formatStatus(status: string | null | undefined) {
  if (!status) return 'Not recorded';
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}
```

Add:

```tsx
function getWorkflow(order: Order) {
  return KITCHEN_WORKFLOW[order.status] ?? {
    step: formatStatus(order.status),
    nextAction: 'No kitchen action',
    focus: 'Review',
    guidance: 'This order does not need a kitchen state change right now.',
  };
}

function getReadyTiming(order: Order) {
  if (order.actual_ready_at) {
    return `Marked ready ${new Date(order.actual_ready_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (order.estimated_ready_at) {
    const minutes = Math.round((Date.parse(order.estimated_ready_at) - Date.now()) / 60000);
    if (minutes < -5) return `${Math.abs(minutes)} min late`;
    if (minutes <= 0) return 'Due now';
    return `Ready in ${minutes} min`;
  }
  return 'Ready time not set';
}
```

- [ ] **Step 3: Add workflow metrics inside `OrdersList`**

Add after `filteredOrders`:

```tsx
const workflowMetrics = {
  decisions: orders.filter((order) => order.status === 'pending').length,
  inPrep: orders.filter((order) => order.status === 'accepted' || order.status === 'preparing').length,
  readyForPickup: orders.filter((order) => order.status === 'ready_for_pickup').length,
  late: orders.filter((order) => {
    if (!['pending', 'accepted', 'preparing'].includes(order.status)) return false;
    if (!order.estimated_ready_at) return false;
    return Date.parse(order.estimated_ready_at) < Date.now();
  }).length,
};
```

- [ ] **Step 4: Render the summary before filter chips**

Insert after the realtime indicator block and before filter chips:

```tsx
<section className="mt-4 rounded-lg border border-divider bg-white p-4 shadow-sm">
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-base font-bold text-text">Kitchen workflow</h2>
      <p className="text-sm text-textMuted">Track decisions, prep, and pickup handoff from one queue.</p>
    </div>
  </div>
  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
    {[
      ['New decisions', workflowMetrics.decisions],
      ['In prep', workflowMetrics.inPrep],
      ['Ready for pickup', workflowMetrics.readyForPickup],
      ['Late tickets', workflowMetrics.late],
    ].map(([label, value]) => (
      <div key={label} className="rounded-lg border border-divider bg-surfaceMuted p-3">
        <p className="text-xs font-semibold uppercase text-textMuted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-text">{value}</p>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 5: Use readable labels for filters and badges**

In the filter buttons, replace:

```tsx
{status === 'all' ? 'All' : status.replace(/_/g, ' ')}
```

with:

```tsx
{status === 'all' ? 'All' : formatStatus(status)}
```

In the order badge, replace:

```tsx
{order.status.replace(/_/g, ' ')}
```

with:

```tsx
{formatStatus(order.status)}
```

In the empty state, replace:

```tsx
No {filter === 'all' ? '' : filter.replace(/_/g, ' ')} orders
```

with:

```tsx
No {filter === 'all' ? '' : formatStatus(filter).toLowerCase()} orders
```

- [ ] **Step 6: Render the per-order kitchen step panel**

Inside the order card, after the status/countdown row and before the customer/delivery/payment grid, add:

```tsx
{(() => {
  const workflow = getWorkflow(order);
  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primarySoft p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Kitchen step</p>
          <p className="mt-1 text-base font-bold text-text">{workflow.step}</p>
          <p className="mt-1 text-sm text-textMuted">{workflow.guidance}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm md:min-w-64">
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-xs font-semibold uppercase text-textMuted">Next action</p>
            <p className="mt-1 font-semibold text-text">{workflow.nextAction}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-xs font-semibold uppercase text-textMuted">Timing</p>
            <p className="mt-1 font-semibold text-text">{getReadyTiming(order)}</p>
          </div>
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 7: Run component test to verify GREEN**

Run:

```powershell
pnpm --filter @ridendine/chef-admin test -- orders-list-readiness.test.tsx
```

Expected: new component tests pass. If local tooling is unavailable, record the exact shell error.

---

### Task 3: Update Chef Smoke Coverage

**Files:**
- Modify: `apps/chef-admin/src/__tests__/platform-smoke.test.ts`

- [ ] **Step 1: Add smoke assertions**

In the `orders list uses protected action payloads and empty state` test, add:

```ts
expect(src).toContain('Kitchen workflow');
expect(src).toContain('Kitchen step');
expect(src).toContain('Next action');
expect(src).toContain('Ready for pickup');
```

- [ ] **Step 2: Run smoke test**

Run:

```powershell
pnpm --filter @ridendine/chef-admin test -- platform-smoke.test.ts
```

Expected: smoke test passes. If local tooling is unavailable, record the exact shell error.

---

### Task 4: Verify, Document, Commit, Push, and Deploy

**Files:**
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`

- [ ] **Step 1: Run local verification**

Run:

```powershell
pnpm --filter @ridendine/chef-admin test -- orders-list-readiness.test.tsx platform-smoke.test.ts
pnpm --filter @ridendine/chef-admin typecheck
git diff --check
```

Expected: tests, typecheck, and whitespace check pass. If local Node tooling is unavailable, record the exact failure and use Vercel builds as the executable verification gate.

- [ ] **Step 2: Update Obsidian**

Add Phase 6c to the current phase table:

```markdown
| 6c | Chef readiness workflow | Complete, pushed, deployed | Medium |
```

Add a `## Phase 6c - Chef Readiness Workflow` section with execution log entries for spec, plan, implementation, local verification blocker, GitHub commit, Vercel deployment, and chef production smoke.

- [ ] **Step 3: Commit code and plan**

Run:

```powershell
git add docs/superpowers/plans/2026-06-06-chef-readiness-workflow.md
git commit -m "docs(chef): add readiness workflow implementation plan"
git add apps/chef-admin/src/__tests__/orders-list-readiness.test.tsx apps/chef-admin/src/__tests__/platform-smoke.test.ts apps/chef-admin/src/components/orders/orders-list.tsx
git commit -m "feat(chef): clarify kitchen readiness workflow"
```

- [ ] **Step 4: Push**

Run:

```powershell
git push origin master
```

Expected: GitHub accepts the Phase 6c commits.

- [ ] **Step 5: Verify Vercel deployments**

Use Vercel project IDs:

- Web: `prj_qlqLOnEDoLRm9M4kV57F7lsWrMUe`
- Driver: `prj_MK2OlNz79dbLvmvwzRHGUkF2ujyF`
- Ops: `prj_RgQF9FvEBdpW4v8px65TaPLJQnsY`
- Chef: `prj_DCDhJ2KlsyVvwQgGs9HcgZmxOdrg`

Expected: all four latest production deployments reach `READY` on the pushed Phase 6c commit.

- [ ] **Step 6: Production smoke**

Run:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = 'sean@ridendine.ca'; password = 'password123' } | ConvertTo-Json
$login = Invoke-WebRequest -Uri 'https://chef.ridendine.ca/api/auth/login' -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing
$orders = Invoke-WebRequest -Uri 'https://chef.ridendine.ca/dashboard/orders' -WebSession $session -UseBasicParsing
```

Expected: login returns `200 application/json`; dashboard orders page returns `200 text/html`.

---

## Self-Review Checklist

- Spec coverage: summary metrics, per-order workflow guidance, readable labels, tests, Obsidian, GitHub, Vercel, and production smoke are covered.
- Boundary control: no schema changes, no API route changes, no engine action changes, no customer/driver/ops behavior changes.
- TDD: component tests are written before modifying `OrdersList`.
- Type consistency: workflow helpers use the existing `Order` interface and action payloads remain unchanged.
