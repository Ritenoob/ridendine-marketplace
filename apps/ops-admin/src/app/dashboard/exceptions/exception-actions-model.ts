import type { ExceptionOwnerState, ExceptionStatus } from './exception-queue-model';

export type ExceptionAction =
  | 'acknowledge'
  | 'assign'
  | 'update_status'
  | 'escalate'
  | 'resolve'
  | 'add_note';

export type ExceptionUpdateStatus =
  | 'in_progress'
  | 'pending_customer'
  | 'pending_chef'
  | 'pending_driver';

export interface ExceptionActionSubject {
  id: string;
  status: ExceptionStatus;
  ownerState: ExceptionOwnerState;
}

export interface ExceptionActionAvailability {
  canAcknowledge: boolean;
  canAssign: boolean;
  canUpdateStatus: boolean;
  canEscalate: boolean;
  canResolve: boolean;
  canAddNote: boolean;
}

export type ExceptionActionDraft =
  | { action: 'acknowledge' }
  | { action: 'assign' }
  | { action: 'update_status'; status: ExceptionUpdateStatus; note?: string }
  | { action: 'escalate'; note: string }
  | { action: 'resolve'; note: string }
  | { action: 'add_note'; note: string };

export type ExceptionActionPayload =
  | { action: 'acknowledge' }
  | { action: 'assign' }
  | { action: 'update_status'; status: ExceptionUpdateStatus; notes?: string }
  | { action: 'escalate'; reason: string }
  | { action: 'resolve'; resolution: string }
  | { action: 'add_note'; content: string; isInternal: true };

export const EXCEPTION_UPDATE_STATUSES: Array<{ value: ExceptionUpdateStatus; label: string }> = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'pending_customer', label: 'Waiting on customer' },
  { value: 'pending_chef', label: 'Waiting on chef' },
  { value: 'pending_driver', label: 'Waiting on driver' },
];

const TERMINAL_STATUSES: ExceptionStatus[] = ['resolved', 'closed'];

function cleanText(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function isTerminalExceptionStatus(status: ExceptionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getExceptionActionAvailability(
  subject: ExceptionActionSubject
): ExceptionActionAvailability {
  const terminal = isTerminalExceptionStatus(subject.status);
  const unassigned = subject.ownerState === 'unassigned';

  return {
    canAcknowledge: subject.status === 'open',
    canAssign: !terminal && unassigned && subject.status !== 'open',
    canUpdateStatus: !terminal,
    canEscalate: !terminal && subject.status !== 'escalated',
    canResolve: !terminal,
    canAddNote: true,
  };
}

export function getExceptionActionError(draft: ExceptionActionDraft): string | null {
  if (draft.action === 'acknowledge' || draft.action === 'assign') {
    return null;
  }

  if (draft.action === 'update_status') {
    return null;
  }

  if (cleanText(draft.note).length < 3) {
    return 'Enter at least 3 characters before submitting.';
  }

  return null;
}

export function buildExceptionActionPayload(
  draft: ExceptionActionDraft
): ExceptionActionPayload {
  if (draft.action === 'acknowledge') {
    return { action: 'acknowledge' };
  }

  if (draft.action === 'assign') {
    return { action: 'assign' };
  }

  if (draft.action === 'update_status') {
    const notes = cleanText(draft.note);
    return {
      action: 'update_status',
      status: draft.status,
      ...(notes ? { notes } : {}),
    };
  }

  if (draft.action === 'escalate') {
    return { action: 'escalate', reason: cleanText(draft.note) };
  }

  if (draft.action === 'resolve') {
    return { action: 'resolve', resolution: cleanText(draft.note) };
  }

  return { action: 'add_note', content: cleanText(draft.note), isInternal: true };
}
