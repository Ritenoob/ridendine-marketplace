import {
  buildExceptionActionPayload,
  getExceptionActionAvailability,
  getExceptionActionError,
  type ExceptionActionDraft,
  type ExceptionActionSubject,
} from '../exception-actions-model';

function subject(overrides: Partial<ExceptionActionSubject> = {}): ExceptionActionSubject {
  return {
    id: '123e4567-e89b-12d3-a456-426614174099',
    status: 'open',
    ownerState: 'unassigned',
    ...overrides,
  };
}

describe('exception actions model', () => {
  it('offers acknowledge for open exceptions and assign for unassigned active exceptions', () => {
    expect(getExceptionActionAvailability(subject({ status: 'open', ownerState: 'unassigned' }))).toMatchObject({
      canAcknowledge: true,
      canAssign: false,
      canUpdateStatus: true,
      canEscalate: true,
      canResolve: true,
      canAddNote: true,
    });

    expect(getExceptionActionAvailability(subject({ status: 'pending_customer', ownerState: 'unassigned' }))).toMatchObject({
      canAcknowledge: false,
      canAssign: true,
    });
  });

  it('locks mutation actions for resolved exceptions', () => {
    expect(getExceptionActionAvailability(subject({ status: 'resolved', ownerState: 'owned' }))).toMatchObject({
      canAcknowledge: false,
      canAssign: false,
      canUpdateStatus: false,
      canEscalate: false,
      canResolve: false,
      canAddNote: true,
    });
  });

  it('builds PATCH payloads for each exception action', () => {
    expect(buildExceptionActionPayload({ action: 'acknowledge' })).toEqual({ action: 'acknowledge' });
    expect(buildExceptionActionPayload({ action: 'assign' })).toEqual({ action: 'assign' });
    expect(buildExceptionActionPayload({ action: 'update_status', status: 'pending_driver', note: 'Waiting on pickup proof' })).toEqual({
      action: 'update_status',
      status: 'pending_driver',
      notes: 'Waiting on pickup proof',
    });
    expect(buildExceptionActionPayload({ action: 'escalate', note: 'Payment risk needs manager review' })).toEqual({
      action: 'escalate',
      reason: 'Payment risk needs manager review',
    });
    expect(buildExceptionActionPayload({ action: 'resolve', note: 'Driver reassigned and delivery completed' })).toEqual({
      action: 'resolve',
      resolution: 'Driver reassigned and delivery completed',
    });
    expect(buildExceptionActionPayload({ action: 'add_note', note: 'Customer updated by support' })).toEqual({
      action: 'add_note',
      content: 'Customer updated by support',
      isInternal: true,
    });
  });

  it('validates required action text before submitting', () => {
    const escalate: ExceptionActionDraft = { action: 'escalate', note: 'ok' };
    const resolve: ExceptionActionDraft = { action: 'resolve', note: '' };
    const status: ExceptionActionDraft = { action: 'update_status', status: 'pending_chef', note: '' };

    expect(getExceptionActionError(escalate)).toBe('Enter at least 3 characters before submitting.');
    expect(getExceptionActionError(resolve)).toBe('Enter at least 3 characters before submitting.');
    expect(getExceptionActionError(status)).toBeNull();
  });
});
