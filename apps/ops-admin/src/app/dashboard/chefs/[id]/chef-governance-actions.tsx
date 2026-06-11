'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Destructive (and suspension-lifting) actions require an explicit
// confirmation with a reason; the engine rejects them without one
// (REASON_REQUIRED).
const CONFIRM_PROMPTS: Partial<Record<string, string>> = {
  reject: 'Reject this chef application?',
  suspend: 'Suspend this chef? Their storefront will be taken offline.',
  unsuspend: 'Restore this suspended chef?',
};

export function ChefGovernanceActions({
  chefId,
  chefStatus,
}: {
  chefId: string;
  chefStatus: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: 'approve' | 'reject' | 'suspend' | 'unsuspend') {
    setError(null);

    let reason: string | undefined;
    const confirmPrompt = CONFIRM_PROMPTS[action];
    if (confirmPrompt) {
      const input = window.prompt(`${confirmPrompt}\n\nEnter a reason (required):`);
      if (input === null) return; // operator cancelled
      reason = input.trim();
      if (!reason) {
        setError('A reason is required for this action.');
        return;
      }
    }

    setSubmitting(action);

    try {
      const response = await fetch(`/api/chefs/${chefId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error?.message ?? json?.error ?? 'Failed to update chef governance state');
      }

      router.refresh();
    } catch (err) {
      console.error('Chef governance action failed:', err);
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {chefStatus === 'pending' && (
          <>
            <button
              onClick={() => handleAction('approve')}
              disabled={submitting !== null}
              className="rounded-lg bg-success px-4 py-2 text-white transition-colors hover:bg-success disabled:opacity-50"
            >
              {submitting === 'approve' ? 'Approving...' : 'Approve Chef'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={submitting !== null}
              className="rounded-lg bg-danger px-4 py-2 text-white transition-colors hover:bg-danger disabled:opacity-50"
            >
              {submitting === 'reject' ? 'Rejecting...' : 'Reject Application'}
            </button>
          </>
        )}

        {chefStatus === 'approved' && (
          <button
            onClick={() => handleAction('suspend')}
            disabled={submitting !== null}
            className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary disabled:opacity-50"
          >
            {submitting === 'suspend' ? 'Suspending...' : 'Suspend Chef'}
          </button>
        )}

        {chefStatus === 'suspended' && (
          <button
            onClick={() => handleAction('unsuspend')}
            disabled={submitting !== null}
            className="rounded-lg bg-success px-4 py-2 text-white transition-colors hover:bg-success disabled:opacity-50"
          >
            {submitting === 'unsuspend' ? 'Restoring...' : 'Restore Chef'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
