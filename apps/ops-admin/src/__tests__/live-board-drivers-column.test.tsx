import { render, screen } from '@testing-library/react';
import { DriversColumn } from '../app/dashboard/_components/drivers-column';

describe('DriversColumn', () => {
  it('shows dispatch readiness on live-board driver cards', () => {
    render(
      <DriversColumn
        drivers={[
          {
            id: 'driver-1',
            displayName: 'Sean Driver',
            driverRowStatus: 'approved',
            presenceStatus: 'offline',
            activeDeliveryCount: 1,
            lastPingAt: '2026-06-08T00:00:00.000Z',
            currentDeliveryOrderId: 'order-1',
            currentDeliveryId: 'delivery-1',
            lat: null,
            lng: null,
            readiness: {
              status: 'active_delivery_risk',
              label: 'Active delivery risk',
              detail: 'Driver has an active delivery but is currently offline.',
              blocksDispatch: true,
              priority: 'danger',
            },
          },
        ]}
      />
    );

    expect(screen.getByText('Active delivery risk')).toBeInTheDocument();
    expect(screen.getByText(/driver has an active delivery but is currently offline/i)).toBeInTheDocument();
  });
});
