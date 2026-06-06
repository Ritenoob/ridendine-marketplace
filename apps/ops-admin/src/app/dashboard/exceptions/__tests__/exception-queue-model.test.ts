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
    const queue = buildExceptionQueue(
      [
        row({ id: 'medium', severity: 'medium', created_at: '2026-06-06T10:00:00Z' }),
        row({ id: 'critical', severity: 'critical', created_at: '2026-06-06T11:00:00Z' }),
        row({
          id: 'escalated',
          status: 'escalated',
          severity: 'high',
          created_at: '2026-06-06T11:30:00Z',
        }),
      ],
      { now }
    );

    expect(queue.reviewQueue.map((item) => item.id)).toEqual(['critical', 'escalated', 'medium']);
    expect(queue.summary.totalOpen).toBe(3);
    expect(queue.summary.criticalOrHigh).toBe(2);
  });

  it('tracks unassigned and waiting-on-participant buckets', () => {
    const queue = buildExceptionQueue(
      [
        row({ id: 'unassigned', assigned_to: null }),
        row({ id: 'customer', status: 'pending_customer', assigned_to: 'ops_1' }),
      ],
      { now }
    );

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
