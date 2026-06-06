# Ops Exception Dashboard Design

Date: 2026-06-06  
Phase: 5 - Ops exception ownership and SLA workflow  
Scope: read-only exception visibility first

## Decision

Build a dedicated Ops Exceptions dashboard at `/dashboard/exceptions` that aggregates existing exception and SLA data without introducing new database tables or workflow mutations in this slice.

This is the safest next phase because the codebase already has:

- `order_exceptions` with status, severity, SLA deadline, related entities, assignment, escalation, and resolution fields.
- `sla_timers` for engine SLA timing.
- `system_alerts` for active Ops alerts.
- `support_tickets` and the support queue page.
- Guarded exception APIs at `/api/engine/exceptions` and `/api/engine/exceptions/[id]`.
- Engine methods for exception queue, counts, detail, acknowledgement, escalation, status update, resolution, and notes.

## Goals

- Give Ops a single exception control view separate from the support ticket queue.
- Show which exceptions are unowned, at risk, breached, escalated, or waiting on a participant.
- Preserve links to orders, deliveries, chefs, drivers, and support.
- Document the exception control loop before enabling more mutations from the UI.

## Non-Goals

- No schema migration.
- No automatic assignment.
- No auto-escalation or auto-resolution.
- No customer, chef, or driver visible behavior changes.
- No new notification automation.

## Proposed UI

Add `/dashboard/exceptions` under the Operate navigation group.

The page has four layers:

1. Summary cards for open, critical/high, unassigned, breached SLA, and escalated exceptions.
2. Filter links for all, critical, unassigned, breached, escalated, and waiting-on-participant.
3. Exception queue rows with severity, status, owner state, SLA state, related entity links, age, and recommended next action.
4. Side rail with active system alerts and support handoff counts.

## Model

Create a pure model in `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts`.

The model accepts engine exception rows and optional alert/support counts. It returns:

- `ExceptionQueueItem`
- `ExceptionQueueSummary`
- sorted `reviewQueue`
- filter buckets
- SLA state per item
- owner state per item
- primary action per item

Risk and sorting rules:

| Signal | Treatment |
|---|---|
| `severity = critical` | Highest priority |
| `status = escalated` | Highest priority after critical |
| SLA deadline in the past | Breached |
| SLA deadline inside 15 minutes | At risk |
| `assignedTo` missing | Unassigned |
| `status` starts with `pending_` | Waiting on customer, chef, or driver |
| Older created time | Sort ahead within same priority |

## Data Sources

The first implementation reads directly on the server:

- `getEngine().support.getExceptionQueue()`
- `getEngine().support.getExceptionCounts()`
- `getEngine().support.getSLAStatus()`
- `system_alerts` through the admin client for active alerts
- `support_tickets` through the admin client for open-ticket count

The page requires `exceptions_read`. If the actor lacks that capability, show an access-restricted card.

## Existing Contract Gap

The database has `order_exceptions.assigned_to`, and `acknowledgeException()` writes it. The exported `Exception` type and `mapException()` currently do not expose it.

For this read-only slice, the page may use a local row type from direct Supabase reads if needed. The follow-up mutation slice should decide whether to expose `assignedTo` through `@ridendine/types` and the engine mapper before adding ownership actions.

## Testing

Add tests for the pure model:

- Critical and escalated items sort first.
- Missing owner is counted as unassigned.
- SLA deadline states are computed as breached, at risk, on track, or none.
- Pending participant statuses produce the right waiting bucket and primary action.

Focused command:

```powershell
pnpm --filter @ridendine/ops-admin test -- exception-queue-model
```

In the current local environment this command is expected to be blocked because `pnpm` is not installed. The test file still documents the expected behavior and should run in the normal project toolchain.

## Follow-Up Slice

After the read-only dashboard is reviewed, the next Phase 5 slice can add guarded actions:

- acknowledge and self-assign
- status update
- escalation
- internal note
- resolution

Those actions should use the existing exception APIs and should include model tests plus UI behavior checks.
