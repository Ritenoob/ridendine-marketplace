# Driver Workflow Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the driver app show a clear live-delivery work panel, the next safe action, and an inline issue-report path into Ops without changing schema or cross-app APIs.

**Architecture:** Keep the change inside `apps/driver-app`. `DeliveryDetail.tsx` owns live workflow state, issue form state, and calls the existing `POST /api/deliveries/[id]/issue` endpoint; `DriverDashboard.tsx` only improves status labels and queue copy. Tests cover the new component behavior before implementation and preserve the existing dashboard empty-state contract.

**Tech Stack:** Next.js App Router, React 18, Jest, Testing Library, Tailwind classes, existing `@ridendine/ui` Card/Button components, existing driver issue validation/API.

---

## File Structure

- Create `apps/driver-app/src/__tests__/delivery-detail-workflow.test.tsx`
  - Component-level Jest tests for the live delivery work panel and issue submission behavior.
- Modify `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx`
  - Add status-to-work helpers, inline issue state, issue submit handler, current work panel, and issue panel.
- Modify `apps/driver-app/src/app/components/DriverDashboard.tsx`
  - Add small status helper functions and clearer active/queued/offline copy.
- Modify `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`
  - Update the existing subtitle assertion and add a focused active-delivery CTA/status test.
- Modify `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`
  - Record Phase 6b implementation and verification results.

---

### Task 1: Add Delivery Detail Workflow Tests

**Files:**
- Create: `apps/driver-app/src/__tests__/delivery-detail-workflow.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `apps/driver-app/src/__tests__/delivery-detail-workflow.test.tsx` with:

```tsx
/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeliveryDetail from '../app/delivery/[id]/components/DeliveryDetail';

const refreshMock = jest.fn();
const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    className,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/hooks/use-location-tracker', () => ({
  useLocationTracker: jest.fn(),
}));

jest.mock('@/components/map/route-map', () => ({
  RouteMap: () => <div data-testid="route-map" />,
}));

const deliveryFixture = {
  id: 'del-1',
  driver_id: 'driver-1',
  status: 'accepted',
  pickup_address: '10 King St W, Hamilton, ON',
  pickup_lat: 43.255,
  pickup_lng: -79.869,
  dropoff_address: '100 Main St E, Hamilton, ON',
  dropoff_lat: 43.254,
  dropoff_lng: -79.866,
  distance_km: 3.4,
  delivery_fee: 6.25,
  driver_payout: 8.5,
};

const orderFixture = {
  order_number: 'RD-1001',
  special_instructions: 'Leave at the front desk',
  customer_phone: '555-0101',
};

describe('DeliveryDetail workflow clarity', () => {
  beforeEach(() => {
    refreshMock.mockClear();
    pushMock.mockClear();
    global.fetch = jest.fn() as jest.Mock;
    window.open = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows current work, focus, and the next driver action', () => {
    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    expect(screen.getByRole('heading', { name: 'Delivery work' })).toBeInTheDocument();
    expect(screen.getByText('Current step')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('Pickup')).toBeInTheDocument();
    expect(screen.getByText('Next action')).toBeInTheDocument();
    expect(screen.getAllByText('Start Navigation to Pickup').length).toBeGreaterThan(0);
    expect(screen.getByText(/head to the restaurant/i)).toBeInTheDocument();
  });

  it('submits a delivery issue to Ops and confirms it was sent', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { issue: { id: 'exc-1' } } }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /report issue to ops/i }));
    fireEvent.change(screen.getByLabelText('Issue type'), {
      target: { value: 'chef_delay' },
    });
    fireEvent.change(screen.getByLabelText('Issue notes'), {
      target: { value: 'Chef needs another 20 minutes.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send issue to Ops' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/deliveries/del-1/issue',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'chef_delay',
            notes: 'Chef needs another 20 minutes.',
          }),
        })
      );
    });
    expect(screen.getByText(/ops has received this issue/i)).toBeInTheDocument();
  });

  it('keeps issue notes visible when Ops issue submission fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Issue could not be recorded' }),
    });

    render(<DeliveryDetail delivery={deliveryFixture as any} order={orderFixture} />);

    fireEvent.click(screen.getByRole('button', { name: /report issue to ops/i }));
    fireEvent.change(screen.getByLabelText('Issue notes'), {
      target: { value: 'Customer is not answering the phone.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send issue to Ops' }));

    expect(await screen.findByText('Issue could not be recorded')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Customer is not answering the phone.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- delivery-detail-workflow.test.tsx
```

Expected: tests fail because `Delivery work`, `Report issue to Ops`, issue labels, and submit behavior do not exist yet. If local tooling is unavailable, record the exact shell error and continue with implementation, then use Vercel build verification after push.

---

### Task 2: Implement Delivery Work Panel and Ops Issue Reporting

**Files:**
- Modify: `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx`

- [ ] **Step 1: Add issue types and work-step helpers near the top of `DeliveryDetail.tsx`**

Add these definitions after `type DeliveryStatus`:

```tsx
type DeliveryIssueType =
  | 'chef_delay'
  | 'customer_unavailable'
  | 'damaged_package'
  | 'unsafe_route'
  | 'driver_emergency'
  | 'wrong_address'
  | 'unable_to_complete';

const ISSUE_OPTIONS: Array<{ value: DeliveryIssueType; label: string }> = [
  { value: 'chef_delay', label: 'Chef delay' },
  { value: 'customer_unavailable', label: 'Customer unavailable' },
  { value: 'damaged_package', label: 'Damaged package' },
  { value: 'unsafe_route', label: 'Unsafe route' },
  { value: 'driver_emergency', label: 'Driver emergency' },
  { value: 'wrong_address', label: 'Wrong address' },
  { value: 'unable_to_complete', label: 'Unable to complete' },
];

const WORK_STEPS: Record<
  DeliveryStatus,
  { label: string; focus: 'Pickup' | 'Dropoff'; guidance: string }
> = {
  accepted: {
    label: 'Accepted',
    focus: 'Pickup',
    guidance: 'Head to the restaurant and keep the order visible in this app.',
  },
  en_route_to_pickup: {
    label: 'En route to pickup',
    focus: 'Pickup',
    guidance: 'Follow the route to the restaurant, then mark arrival when you are there.',
  },
  arrived_at_pickup: {
    label: 'At restaurant',
    focus: 'Pickup',
    guidance: 'Confirm the order with the chef and take pickup proof before leaving.',
  },
  picked_up: {
    label: 'Picked up',
    focus: 'Dropoff',
    guidance: 'Start customer navigation and keep the package secure.',
  },
  en_route_to_dropoff: {
    label: 'En route to customer',
    focus: 'Dropoff',
    guidance: 'Follow the route to the customer and watch for delivery instructions.',
  },
  arrived_at_dropoff: {
    label: 'At customer',
    focus: 'Dropoff',
    guidance: 'Capture proof of delivery, collect the optional signature, and complete the delivery.',
  },
};
```

- [ ] **Step 2: Add issue state inside the component**

Add state after `errorMessage`:

```tsx
const [showIssuePanel, setShowIssuePanel] = useState(false);
const [issueType, setIssueType] = useState<DeliveryIssueType>('chef_delay');
const [issueNotes, setIssueNotes] = useState('');
const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
const [issueError, setIssueError] = useState<string | null>(null);
const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
```

- [ ] **Step 3: Add the issue submit handler before `handleAction`**

Add:

```tsx
const handleIssueSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const trimmedNotes = issueNotes.trim();
  if (!trimmedNotes) {
    setIssueError('Add a short note so Ops knows what is happening.');
    return;
  }

  setIsSubmittingIssue(true);
  setIssueError(null);
  setIssueSuccess(null);

  try {
    const response = await fetch(`/api/deliveries/${delivery.id}/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueType, notes: trimmedNotes }),
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      throw new Error(json.error || 'Unable to send this issue right now.');
    }

    setIssueSuccess(
      'Ops has received this issue. Keep working if it is safe, or wait for Ops if this blocks the delivery.'
    );
    setIssueNotes('');
  } catch (error) {
    setIssueError(error instanceof Error ? error.message : 'Unable to send this issue right now.');
  } finally {
    setIsSubmittingIssue(false);
  }
};
```

- [ ] **Step 4: Compute current work info before the return**

Add after `const action = getNextAction();`:

```tsx
const workStep = WORK_STEPS[status];
```

- [ ] **Step 5: Render the delivery work panel after progress steps**

Insert this block after the Progress Steps section and before the Navigation Button section:

```tsx
<div className="p-4">
  <Card className="border border-divider bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Delivery work</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">{workStep.guidance}</p>
      </div>
      <span className="rounded-full bg-infoSoft px-3 py-1 text-[12px] font-semibold text-info">
        {workStep.focus}
      </span>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-surfaceMuted p-3">
        <p className="text-[12px] font-medium uppercase text-[#6b7280]">Current step</p>
        <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">{workStep.label}</p>
      </div>
      <div className="rounded-lg bg-surfaceMuted p-3">
        <p className="text-[12px] font-medium uppercase text-[#6b7280]">Next action</p>
        <p className="mt-1 text-[15px] font-semibold text-[#1a1a1a]">
          {status === 'arrived_at_dropoff' ? 'Complete Delivery' : action?.label ?? 'No action needed'}
        </p>
      </div>
    </div>

    <button
      type="button"
      className="mt-4 w-full rounded-lg border border-danger/30 px-4 py-3 text-[14px] font-semibold text-danger transition-colors hover:bg-dangerSoft"
      onClick={() => {
        setShowIssuePanel((current) => !current);
        setIssueError(null);
        setIssueSuccess(null);
      }}
    >
      {showIssuePanel ? 'Close issue report' : 'Report issue to Ops'}
    </button>
  </Card>
</div>
```

- [ ] **Step 6: Render the inline issue panel after the work panel**

Insert immediately after the work panel:

```tsx
{showIssuePanel && (
  <div className="px-4 pb-4">
    <Card className="border border-danger/20 bg-white p-4 shadow-sm">
      <h3 className="text-[16px] font-semibold text-[#1a1a1a]">Send issue to Ops</h3>
      <form className="mt-4 space-y-4" onSubmit={handleIssueSubmit}>
        <label className="block">
          <span className="text-[13px] font-medium text-[#374151]">Issue type</span>
          <select
            aria-label="Issue type"
            value={issueType}
            onChange={(event) => setIssueType(event.target.value as DeliveryIssueType)}
            className="mt-1 w-full rounded-lg border border-divider bg-white px-3 py-2 text-[14px] text-[#1a1a1a]"
          >
            {ISSUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[#374151]">Issue notes</span>
          <textarea
            aria-label="Issue notes"
            value={issueNotes}
            onChange={(event) => setIssueNotes(event.target.value)}
            rows={4}
            maxLength={1000}
            className="mt-1 w-full resize-none rounded-lg border border-divider px-3 py-2 text-[14px] text-[#1a1a1a]"
            placeholder="Example: Chef needs another 20 minutes."
          />
        </label>

        {issueError && (
          <p className="rounded-lg bg-dangerSoft p-3 text-[13px] font-medium text-danger">
            {issueError}
          </p>
        )}
        {issueSuccess && (
          <p className="rounded-lg bg-successSoft p-3 text-[13px] font-medium text-success">
            {issueSuccess}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmittingIssue}
          className="w-full rounded-lg bg-danger py-3 text-[14px] font-semibold text-white hover:bg-danger/90 disabled:opacity-60"
        >
          {isSubmittingIssue ? 'Sending...' : 'Send issue to Ops'}
        </Button>
      </form>
    </Card>
  </div>
)}
```

- [ ] **Step 7: Run the delivery detail tests to verify GREEN**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- delivery-detail-workflow.test.tsx
```

Expected: all tests in `delivery-detail-workflow.test.tsx` pass. If local tooling is unavailable, record the exact shell error for the final verification note.

- [ ] **Step 8: Commit the delivery detail work**

Run:

```powershell
git add apps/driver-app/src/__tests__/delivery-detail-workflow.test.tsx apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx
git commit -m "feat(driver): clarify live delivery workflow"
```

---

### Task 3: Improve Driver Dashboard Copy and Tests

**Files:**
- Modify: `apps/driver-app/src/app/components/DriverDashboard.tsx`
- Modify: `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`

- [ ] **Step 1: Write dashboard test updates**

Update the subtitle test in `apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx`:

```tsx
it('renders subtitle pointing to the offer queue', () => {
  render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);
  expect(
    screen.getByText(/go online when you are ready to receive offers/i)
  ).toBeInTheDocument();
});
```

Add:

```tsx
it('labels the active delivery workflow entry point', () => {
  const delivery = {
    id: 'del-1',
    pickup_address: '1 King St W',
    dropoff_address: '100 Queen St E',
    distance_km: 3.2,
    driver_payout: '8.50',
    status: 'en_route_to_pickup' as const,
  };
  render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[delivery as any]} />);
  expect(screen.getByText('En route to pickup')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /open delivery workflow/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run dashboard tests to verify RED**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-dashboard-empty-state.test.tsx
```

Expected: fails because the dashboard still says the old delivery-offer subtitle, "In Progress", and "View Delivery Details".

- [ ] **Step 3: Add dashboard status helpers**

Add above `export default function DriverDashboard`:

```tsx
const DELIVERY_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  en_route_to_pickup: 'En route to pickup',
  arrived_at_pickup: 'At restaurant',
  picked_up: 'Picked up',
  en_route_to_dropoff: 'En route to customer',
  arrived_at_dropoff: 'At customer',
};

function formatDeliveryStatus(status?: string | null) {
  if (!status) return 'In progress';
  return DELIVERY_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}
```

- [ ] **Step 4: Update active delivery and queue copy**

In `DriverDashboard.tsx`, replace active badge and CTA text:

```tsx
<span className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-semibold text-primary">
  {formatDeliveryStatus(currentDelivery.status)}
</span>
```

```tsx
<button className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primaryHover">
  Open Delivery Workflow
</button>
```

Replace the offline empty subtitle with:

```tsx
Go online when you are ready to receive offers. Keep this app open while you wait.
```

Replace the online waiting subtitle with:

```tsx
You are in the offer queue. Keep this app open; new offers will appear here with a countdown.
```

- [ ] **Step 5: Run dashboard tests to verify GREEN**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- driver-dashboard-empty-state.test.tsx
```

Expected: dashboard tests pass.

- [ ] **Step 6: Commit dashboard clarity work**

Run:

```powershell
git add apps/driver-app/src/app/components/DriverDashboard.tsx apps/driver-app/src/__tests__/driver-dashboard-empty-state.test.tsx
git commit -m "feat(driver): clarify dashboard workflow states"
```

---

### Task 4: Verify, Document, Push, and Watch Deployments

**Files:**
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`

- [ ] **Step 1: Run targeted driver verification**

Run:

```powershell
pnpm --filter @ridendine/driver-app test -- delivery-detail-workflow.test.tsx driver-dashboard-empty-state.test.tsx
pnpm --filter @ridendine/driver-app typecheck
```

Expected: targeted tests and typecheck pass. If local `pnpm` or local Node access is unavailable, record the command and exact failure, then rely on Vercel build status after push.

- [ ] **Step 2: Update the Obsidian phase log**

Add an execution-log entry under Phase 6b:

```markdown
- 2026-06-06 - Phase 6b driver workflow clarity implemented in the driver app. Added a live-delivery work panel, current/next action labels, inline issue reporting to Ops through the existing delivery issue API, and clearer dashboard queue/active-delivery copy.
- 2026-06-06 - Verification: targeted local driver tests/typecheck attempted; Vercel production deployment status checked after GitHub push.
```

Update the current phase table row from:

```markdown
| 6b | Driver workflow clarity | Spec written locally | Medium |
```

to:

```markdown
| 6b | Driver workflow clarity | Implemented and pushed | Medium |
```

- [ ] **Step 3: Commit documentation**

Run:

```powershell
git status --short
git add docs/superpowers/plans/2026-06-06-driver-workflow-clarity.md
git commit -m "docs(driver): add workflow clarity implementation plan"
```

The Obsidian vault file is outside this Git repo, so it remains a local reference update unless the vault is separately versioned.

- [ ] **Step 4: Push commits to GitHub**

Run:

```powershell
git push origin master
```

Expected: GitHub accepts the Phase 6b planning, implementation, dashboard, and docs commits.

- [ ] **Step 5: Verify Vercel production deployments**

Run:

```powershell
npx vercel ls --token $env:VERCEL_TOKEN
```

Expected: driver deployment for the pushed commit reaches `READY`. If Vercel CLI authentication is not available locally, use the connected Vercel app/tools or production HTTP probes and record what could and could not be verified.

---

## Self-Review Checklist

- Spec coverage: Task 2 implements the delivery work panel, next action, and issue reporting; Task 3 implements dashboard state clarity; Task 4 documents and verifies the phase.
- Boundary control: no schema changes, no issue API changes, no Ops/Chef/Customer app changes in this phase.
- TDD: Task 1 and Task 3 write failing tests before production edits.
- Type consistency: `DeliveryIssueType` matches `driverDeliveryIssueSchema`; `WORK_STEPS` keys match `DeliveryStatus`; issue payload uses `{ issueType, notes }`, matching `POST /api/deliveries/[id]/issue`.
