/**
 * @jest-environment node
 */
import {
  DRIVER_DISPATCH_LOCATION_TTL_MS,
  DRIVER_LIVE_LOCATION_LABEL_MS,
  getDriverReadinessSignal,
  type DriverReadinessInput,
} from '../lib/driver-readiness';

const NOW = new Date('2026-06-07T12:00:00.000Z');

function isoAgo(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

function readinessInput(overrides: Partial<DriverReadinessInput> = {}): DriverReadinessInput {
  return {
    approvalStatus: 'approved',
    presenceStatus: 'online',
    lastLocationAt: isoAgo(30_000),
    activeDeliveryCount: 0,
    payoutConnected: true,
    complianceOpenItems: 0,
    now: NOW,
    ...overrides,
  };
}

describe('getDriverReadinessSignal', () => {
  it('uses the driver matching dispatch location freshness TTL', () => {
    expect(DRIVER_DISPATCH_LOCATION_TTL_MS).toBe(90_000);
    expect(DRIVER_LIVE_LOCATION_LABEL_MS).toBe(5 * 60_000);
  });

  it('returns ready for an approved online driver with fresh GPS and no blockers', () => {
    expect(getDriverReadinessSignal(readinessInput())).toMatchObject({
      status: 'ready',
      blocksDispatch: false,
      priority: 'success',
    });
  });

  it('blocks dispatch when an online approved driver has no GPS fix', () => {
    expect(getDriverReadinessSignal(readinessInput({ lastLocationAt: null }))).toMatchObject({
      status: 'needs_location',
      blocksDispatch: true,
    });
  });

  it('blocks dispatch when online driver GPS is older than the dispatch freshness window', () => {
    expect(
      getDriverReadinessSignal(
        readinessInput({ lastLocationAt: isoAgo(DRIVER_DISPATCH_LOCATION_TTL_MS + 1_000) })
      )
    ).toMatchObject({
      status: 'not_dispatchable',
      blocksDispatch: true,
    });
  });

  it('treats an impossible future GPS timestamp as not dispatchable', () => {
    expect(
      getDriverReadinessSignal(readinessInput({ lastLocationAt: '2099-01-01T00:00:00.000Z' }))
    ).toMatchObject({
      status: 'not_dispatchable',
      blocksDispatch: true,
    });
  });

  it('blocks dispatch for a pending driver', () => {
    expect(getDriverReadinessSignal(readinessInput({ approvalStatus: 'pending' }))).toMatchObject({
      status: 'not_approved',
      blocksDispatch: true,
    });
  });

  it('blocks dispatch for a suspended driver', () => {
    expect(getDriverReadinessSignal(readinessInput({ approvalStatus: 'suspended' }))).toMatchObject(
      {
        status: 'suspended',
        blocksDispatch: true,
      }
    );
  });

  it('flags active delivery risk before ordinary GPS blockers when a driver is offline', () => {
    expect(
      getDriverReadinessSignal(
        readinessInput({
          presenceStatus: 'offline',
          lastLocationAt: null,
          activeDeliveryCount: 1,
        })
      )
    ).toMatchObject({
      status: 'active_delivery_risk',
      blocksDispatch: true,
    });
  });

  it('warns without blocking dispatch when payout setup has not started', () => {
    expect(getDriverReadinessSignal(readinessInput({ payoutConnected: false }))).toMatchObject({
      status: 'payout_setup_needed',
      blocksDispatch: false,
      priority: 'warning',
    });
  });

  it('blocks dispatch when compliance has open items', () => {
    expect(getDriverReadinessSignal(readinessInput({ complianceOpenItems: 1 }))).toMatchObject({
      status: 'not_dispatchable',
      blocksDispatch: true,
    });
  });
});
