'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Flag, MessageSquare, UserCheck } from 'lucide-react';
import { Button, Select, Textarea } from '@ridendine/ui';
import {
  EXCEPTION_UPDATE_STATUSES,
  buildExceptionActionPayload,
  getExceptionActionAvailability,
  getExceptionActionError,
  type ExceptionAction,
  type ExceptionActionDraft,
  type ExceptionActionSubject,
  type ExceptionUpdateStatus,
} from './exception-actions-model';

type PanelMode = 'status' | 'escalate' | 'resolve' | 'note' | null;

interface ExceptionActionsProps extends ExceptionActionSubject {
  canWrite: boolean;
}

function modeLabel(mode: Exclude<PanelMode, null>): string {
  if (mode === 'status') return 'Update status';
  if (mode === 'escalate') return 'Escalate';
  if (mode === 'resolve') return 'Resolve';
  return 'Add note';
}

function actionFromMode(mode: Exclude<PanelMode, null>): ExceptionAction {
  if (mode === 'status') return 'update_status';
  if (mode === 'escalate') return 'escalate';
  if (mode === 'resolve') return 'resolve';
  return 'add_note';
}

export function ExceptionActions({
  id,
  status,
  ownerState,
  canWrite,
}: ExceptionActionsProps) {
  const router = useRouter();
  const availability = useMemo(
    () => getExceptionActionAvailability({ id, status, ownerState }),
    [id, ownerState, status]
  );
  const [mode, setMode] = useState<PanelMode>(null);
  const [updateStatus, setUpdateStatus] = useState<ExceptionUpdateStatus>('in_progress');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<ExceptionAction | null>(null);

  if (!canWrite) {
    return (
      <div className="mt-4 rounded-md border border-border bg-surfaceMuted px-4 py-3 text-sm text-textMuted">
        Read-only. Exception write access is required for ownership and status actions.
      </div>
    );
  }

  async function submitAction(draft: ExceptionActionDraft) {
    const actionError = getExceptionActionError(draft);
    if (actionError) {
      setError(actionError);
      setSuccess(null);
      return;
    }

    setSubmitting(draft.action);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/engine/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildExceptionActionPayload(draft)),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        setError(result?.error?.message || result?.error || 'Exception action failed.');
        return;
      }

      setMode(null);
      setNote('');
      setSuccess('Action applied.');
      router.refresh();
    } catch {
      setError('Exception action failed.');
    } finally {
      setSubmitting(null);
    }
  }

  function draftForMode(currentMode: Exclude<PanelMode, null>): ExceptionActionDraft {
    if (currentMode === 'status') {
      return { action: 'update_status', status: updateStatus, note };
    }

    if (currentMode === 'escalate') {
      return { action: 'escalate', note };
    }

    if (currentMode === 'resolve') {
      return { action: 'resolve', note };
    }

    return { action: 'add_note', note };
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-divider bg-surfaceMuted p-4">
      <div className="flex flex-wrap gap-2">
        {availability.canAcknowledge && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            leftIcon={<CheckCircle className="h-4 w-4" aria-hidden="true" />}
            loading={submitting === 'acknowledge'}
            onClick={() => void submitAction({ action: 'acknowledge' })}
          >
            Acknowledge
          </Button>
        )}
        {availability.canAssign && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
            loading={submitting === 'assign'}
            onClick={() => void submitAction({ action: 'assign' })}
          >
            Self-assign
          </Button>
        )}
        {availability.canUpdateStatus && (
          <Button
            type="button"
            size="sm"
            variant={mode === 'status' ? 'primary' : 'outline'}
            leftIcon={<Flag className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setMode(mode === 'status' ? null : 'status');
              setError(null);
              setSuccess(null);
            }}
          >
            Status
          </Button>
        )}
        {availability.canEscalate && (
          <Button
            type="button"
            size="sm"
            variant={mode === 'escalate' ? 'primary' : 'outline'}
            leftIcon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setMode(mode === 'escalate' ? null : 'escalate');
              setError(null);
              setSuccess(null);
            }}
          >
            Escalate
          </Button>
        )}
        {availability.canResolve && (
          <Button
            type="button"
            size="sm"
            variant={mode === 'resolve' ? 'primary' : 'outline'}
            leftIcon={<CheckCircle className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setMode(mode === 'resolve' ? null : 'resolve');
              setError(null);
              setSuccess(null);
            }}
          >
            Resolve
          </Button>
        )}
        {availability.canAddNote && (
          <Button
            type="button"
            size="sm"
            variant={mode === 'note' ? 'primary' : 'outline'}
            leftIcon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setMode(mode === 'note' ? null : 'note');
              setError(null);
              setSuccess(null);
            }}
          >
            Note
          </Button>
        )}
      </div>

      {mode && (
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
          {mode === 'status' ? (
            <Select
              label="Status"
              value={updateStatus}
              onChange={(event) => setUpdateStatus(event.target.value as ExceptionUpdateStatus)}
            >
              {EXCEPTION_UPDATE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : (
            <div className="hidden md:block" aria-hidden="true" />
          )}

          <Textarea
            label={mode === 'status' ? 'Internal note' : `${modeLabel(mode)} note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              mode === 'status'
                ? 'Optional context for Ops'
                : mode === 'escalate'
                  ? 'Reason for escalation'
                  : mode === 'resolve'
                    ? 'Resolution summary'
                    : 'Internal Ops note'
            }
            className="min-h-[84px]"
          />

          <Button
            type="button"
            size="md"
            variant={mode === 'resolve' ? 'primary' : mode === 'escalate' ? 'danger' : 'secondary'}
            loading={submitting === actionFromMode(mode)}
            onClick={() => void submitAction(draftForMode(mode))}
          >
            Apply
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
    </div>
  );
}
