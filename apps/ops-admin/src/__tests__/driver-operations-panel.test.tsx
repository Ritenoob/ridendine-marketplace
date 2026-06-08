import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DriverReadinessSignal } from '@ridendine/types';
import {
  DriverOperationsListBadges,
  DriverOperationsPanel,
} from '../app/dashboard/drivers/driver-operations-panel';
import { DriverGovernanceActions } from '../app/dashboard/drivers/[id]/driver-governance-actions';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const readiness: DriverReadinessSignal = {
  status: 'not_dispatchable',
  label: 'Not dispatchable',
  detail: 'Driver has open compliance items that must be resolved before dispatch.',
  blocksDispatch: true,
  priority: 'danger',
};

const summary = {
  driver: {
    id: 'driver-1',
    name: 'Sean Driver',
    email: 'sean@ridendine.ca',
    phone: '555-0101',
    approvalStatus: 'approved',
    vehicleType: 'car',
    createdAt: '2026-06-08T00:00:00.000Z',
  },
  readiness,
  presence: {
    status: 'online',
    lastLocationAt: '2026-06-08T00:00:00.000Z',
    locationHealth: {
      status: 'live',
      label: 'Live GPS',
      detail: 'Updated 0 min ago',
      minutesOld: 0,
    },
  },
  activeDeliveryCount: 1,
  activeDeliveries: [
    {
      id: 'delivery-1',
      orderId: 'order-1',
      orderNumber: 'RND-1001',
      status: 'en_route_to_pickup',
      updatedAt: '2026-06-08T00:00:00.000Z',
      estimatedDropoffAt: null,
      pickupAddress: '123 Pickup',
      dropoffAddress: '456 Dropoff',
    },
  ],
  openExceptionCount: 2,
  openExceptions: [
    {
      id: 'exception-1',
      type: 'driver_delay',
      status: 'open',
      severity: 'high',
      title: 'Driver late',
      createdAt: '2026-06-08T00:00:00.000Z',
    },
  ],
  compliance: {
    totalDocuments: 3,
    pendingDocuments: 1,
    rejectedDocuments: 1,
    expiredDocuments: 0,
    openItems: 2,
  },
  payout: {
    connected: true,
    accountStatus: 'active',
    payoutsEnabled: true,
    chargesEnabled: true,
    onboardingCompletedAt: '2026-06-08T00:00:00.000Z',
    availableBalanceCents: 12550,
    pendingPayoutCents: 2200,
    currency: 'CAD',
    instantPayoutsEnabled: true,
  },
};

describe('DriverOperationsPanel', () => {
  it('shows readiness, active delivery, exception, compliance, and payout signals', () => {
    render(<DriverOperationsPanel summary={summary} />);

    expect(screen.getByRole('heading', { name: /dispatch readiness/i })).toBeInTheDocument();
    expect(screen.getByText('Not dispatchable')).toBeInTheDocument();
    expect(screen.getByText('Active deliveries')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Open exceptions')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(2);
    expect(screen.getByText('Compliance open items')).toBeInTheDocument();
    expect(screen.getByText('$125.50 CAD')).toBeInTheDocument();
    expect(screen.getByText(/payout account is active/i)).toBeInTheDocument();
  });
});

describe('DriverOperationsListBadges', () => {
  it('shows compact readiness, active work, exception, and payout signals', () => {
    render(<DriverOperationsListBadges summary={summary} />);

    expect(screen.getByText('Not dispatchable')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('2 exceptions')).toBeInTheDocument();
    expect(screen.getByText('Payout active')).toBeInTheDocument();
  });
});

describe('DriverGovernanceActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'driver-1', status: 'suspended' } }),
    }) as jest.Mock;
  });

  it('requires and sends a governance reason for suspension', async () => {
    render(<DriverGovernanceActions driverId="driver-1" currentStatus="approved" />);

    fireEvent.click(screen.getByRole('button', { name: /suspend driver/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/governance reason/i), {
      target: { value: 'Insurance document failed verification.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /suspend driver/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith('/api/drivers/driver-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'suspended',
        reason: 'Insurance document failed verification.',
      }),
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
