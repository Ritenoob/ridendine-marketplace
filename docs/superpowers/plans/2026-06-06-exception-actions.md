# Exception Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled Ops-only exception actions to the deployed exception queue.

**Architecture:** Reuse the existing `/api/engine/exceptions/[id]` PATCH route and operations gateway. Add only the missing self-assign command, then render a client action panel inside each server-rendered exception row.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Vitest, Supabase-backed engine services, existing `exceptions_write` capability.

---

### Task 1: Add Assignment Command Contract

**Files:**
- Modify: `packages/validation/src/schemas/ops.ts`
- Modify: `packages/engine/src/orchestrators/operations-command.gateway.ts`
- Modify: `packages/engine/src/orchestrators/operations-command.gateway.test.ts`
- Modify: `apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts`

- [ ] **Step 1: Write the gateway test**

```ts
it('routes assign_exception commands to the support exception engine', async () => {
  const assignException = vi
    .fn<[], Promise<OperationResult<{ assigned: boolean }>>>()
    .mockResolvedValue({ success: true, data: { assigned: true } });

  const gateway = createOperationsCommandGateway({
    support: { assignException },
  });

  const result = await gateway.execute(
    {
      action: 'assign_exception',
      exceptionId: '123e4567-e89b-12d3-a456-426614174099',
    },
    actor
  );

  expect(result.success).toBe(true);
  expect(assignException).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174099', actor);
});
```

- [ ] **Step 2: Run the focused gateway test**

Run: `pnpm --filter @ridendine/engine test -- operations-command.gateway`

Expected local result in this environment: blocked until `pnpm` is installed. If tooling is available, expected result before implementation is failure because `assign_exception` is not routed.

- [ ] **Step 3: Add the command**

Add this variant to `exceptionCommandSchema`:

```ts
z.object({
  action: z.literal('assign_exception'),
  exceptionId: uuid,
}).strict(),
```

Add this gateway case:

```ts
case 'assign_exception':
  return this.deps.support.assignException(command.exceptionId, actor);
```

Add this route alias:

```ts
assign: 'assign_exception',
```

- [ ] **Step 4: Re-run the focused gateway test**

Run: `pnpm --filter @ridendine/engine test -- operations-command.gateway`

Expected: pass when local tooling is available.

### Task 2: Implement Support Engine Assignment

**Files:**
- Modify: `packages/engine/src/orchestrators/support.engine.ts`
- Modify: `packages/types/src/engine/index.ts`

- [ ] **Step 1: Add assignment method**

Add `assignException(exceptionId, actor)` near `acknowledgeException`. It should read current `assigned_to`, update `assigned_to` to `actor.entityId || actor.userId`, update `updated_at`, and audit the owner change.

```ts
async assignException(exceptionId: string, actor: ActorContext): Promise<OperationResult<Exception>> {
  const { data: current, error: currentError } = await this.client
    .from('order_exceptions')
    .select('assigned_to')
    .eq('id', exceptionId)
    .single();

  if (currentError || !current) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Exception not found' } };
  }

  const assignedTo = actor.entityId || actor.userId;
  const { data: exception, error } = await this.client
    .from('order_exceptions')
    .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq('id', exceptionId)
    .select()
    .single();

  if (error || !exception) {
    return { success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to assign exception' } };
  }

  await this.auditLogger.log({
    action: 'update',
    entityType: 'order_exception',
    entityId: exceptionId,
    actor,
    beforeState: { assigned_to: current.assigned_to ?? null },
    afterState: { assigned_to: assignedTo },
    reason: 'Ops exception assigned',
  });

  return { success: true, data: this.mapException(exception) };
}
```

- [ ] **Step 2: Include `assignedTo` in mapped exception type**

Add optional `assignedTo?: string` to `Exception` and map `row.assigned_to`.

### Task 3: Add Client Action Model

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/exceptions/exception-actions-model.ts`
- Create: `apps/ops-admin/src/app/dashboard/exceptions/__tests__/exception-actions-model.test.ts`

- [ ] **Step 1: Write model tests**

Cover available actions for open/unassigned/resolved rows and payload construction for assign, acknowledge, update status, escalate, resolve, and add note.

- [ ] **Step 2: Run focused model test**

Run: `pnpm --filter @ridendine/ops-admin test -- exception-actions-model`

Expected local result in this environment: blocked until `pnpm` is installed. If tooling is available, expected result before implementation is failure because the model file does not exist.

- [ ] **Step 3: Implement model**

Export active statuses, updateable statuses, `getExceptionActionAvailability`, `buildExceptionActionPayload`, and `getExceptionActionError`.

### Task 4: Add Action Panel UI

**Files:**
- Create: `apps/ops-admin/src/app/dashboard/exceptions/exception-actions.tsx`
- Modify: `apps/ops-admin/src/app/dashboard/exceptions/page.tsx`

- [ ] **Step 1: Create the client component**

Use `fetch('/api/engine/exceptions/${id}', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })`, show error/success state, and call `router.refresh()` on success.

- [ ] **Step 2: Wire the server page**

Compute `canWrite = hasPlatformApiCapability(actor, 'exceptions_write')`, pass it to `ExceptionRow`, and render `ExceptionActions` below links.

### Task 5: Documentation And Verification

**Files:**
- Modify: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\15 - Phased Improvement Execution Plan.md`
- Generated: `C:\RIDENDINE\Ridendine_Business_Bible_Obsidian_Vault\Ridendine_Business_Bible_Obsidian_Vault\06 - Product and Technology\App Architecture\14 - Generated Live Inventory Snapshot.md`

- [ ] **Step 1: Run verification commands**

Run:

```powershell
git diff --check
pnpm --filter @ridendine/engine test -- operations-command.gateway
pnpm --filter @ridendine/ops-admin test -- exception-actions-model
.\scripts\docs\generate-obsidian-architecture.ps1
```

- [ ] **Step 2: Update the vault execution log**

Record local checks, blocked checks, commit hash, push status, and Vercel deployment status.

- [ ] **Step 3: Commit and push**

Use a scoped commit message:

```bash
git commit -m "feat(ops-admin): add exception action controls"
git push origin master
```
