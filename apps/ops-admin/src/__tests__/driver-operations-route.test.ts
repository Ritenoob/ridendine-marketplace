/**
 * @jest-environment node
 */

const mockGetOpsActorContext = jest.fn();
const mockGuardPlatformApi = jest.fn();
const mockAdminClient = { from: jest.fn() };

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

jest.mock('@/lib/engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    getOpsActorContext: () => mockGetOpsActorContext(),
    guardPlatformApi: (...args: unknown[]) => mockGuardPlatformApi(...args),
    errorResponse: (code: string, message: string, status = 500) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }),
    successResponse: (data: unknown) => NextResponse.json({ success: true, data }),
  };
});

import { GET } from '../app/api/drivers/[id]/operations/route';

type Builder = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
};

const DRIVER_ID = 'driver-ops-1';

function singleResult(data: unknown, error: unknown = null): Builder {
  const builder = {} as Builder;
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => Promise.resolve({ data: [], error: null }));
  builder.maybeSingle = jest.fn(() => Promise.resolve({ data, error }));
  return builder;
}

function listResult(data: unknown[], error: unknown = null): Builder {
  const builder = {} as Builder;
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => Promise.resolve({ data, error }));
  builder.maybeSingle = jest.fn(() => Promise.resolve({ data: null, error: null }));
  return builder;
}

function installOpsData(overrides: {
  driver?: Record<string, unknown> | null;
  presence?: Record<string, unknown> | null;
  activeDeliveries?: Record<string, unknown>[];
  openExceptions?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  payoutAccount?: Record<string, unknown> | null;
  platformAccount?: Record<string, unknown> | null;
} = {}) {
  const now = new Date();
  const freshLocation = new Date(now.getTime() - 30_000).toISOString();
  const driver = overrides.driver === undefined
    ? {
        id: DRIVER_ID,
        first_name: 'Sean',
        last_name: 'Driver',
        email: 'sean@ridendine.ca',
        phone: '555-0101',
        status: 'approved',
        vehicle_type: 'car',
        instant_payouts_enabled: true,
        created_at: now.toISOString(),
      }
    : overrides.driver;

  const builders = {
    drivers: singleResult(driver),
    driver_presence: singleResult(
      overrides.presence ?? {
        status: 'online',
        last_location_at: freshLocation,
        last_location_update: freshLocation,
        updated_at: freshLocation,
        current_lat: 49.2827,
        current_lng: -123.1207,
      }
    ),
    deliveries: listResult(
      overrides.activeDeliveries ?? [
        {
          id: 'delivery-1',
          order_id: 'order-1',
          status: 'en_route_to_pickup',
          updated_at: now.toISOString(),
          estimated_dropoff_at: null,
          pickup_address: '123 Pickup',
          dropoff_address: '456 Dropoff',
          orders: { order_number: 'RND-1001' },
        },
      ]
    ),
    order_exceptions: listResult(
      overrides.openExceptions ?? [
        {
          id: 'exception-1',
          exception_type: 'driver_delay',
          status: 'open',
          severity: 'high',
          title: 'Driver late',
          created_at: now.toISOString(),
        },
        {
          id: 'exception-2',
          exception_type: 'missing_proof',
          status: 'escalated',
          severity: 'medium',
          title: 'Proof review',
          created_at: now.toISOString(),
        },
      ]
    ),
    driver_documents: listResult(
      overrides.documents ?? [
        { id: 'doc-1', document_type: 'license', status: 'approved', expires_at: null },
        { id: 'doc-2', document_type: 'insurance', status: 'pending', expires_at: null },
        { id: 'doc-3', document_type: 'background_check', status: 'rejected', expires_at: null },
      ]
    ),
    driver_payout_accounts: singleResult(
      overrides.payoutAccount ?? {
        status: 'active',
        payouts_enabled: true,
        charges_enabled: true,
        onboarding_completed_at: now.toISOString(),
      }
    ),
    platform_accounts: singleResult(
      overrides.platformAccount ?? {
        balance_cents: 12550,
        pending_payout_cents: 2200,
        currency: 'CAD',
        updated_at: now.toISOString(),
      }
    ),
  };

  mockAdminClient.from.mockImplementation((table: keyof typeof builders) => builders[table]);
  return builders;
}

async function callGet(driverId = DRIVER_ID) {
  return GET(new Request(`http://localhost/api/drivers/${driverId}/operations`), {
    params: Promise.resolve({ id: driverId }),
  });
}

describe('GET /api/drivers/[id]/operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOpsActorContext.mockResolvedValue({ userId: 'ops-1', role: 'ops_admin' });
    mockGuardPlatformApi.mockReturnValue(null);
    installOpsData();
  });

  it('returns 401 when there is no ops session', async () => {
    const unauthorized = Response.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
    mockGetOpsActorContext.mockResolvedValue(null);
    mockGuardPlatformApi.mockReturnValue(unauthorized);

    const res = await callGet();

    expect(res.status).toBe(401);
  });

  it('uses ops_entity_read and returns 403 when that capability is denied', async () => {
    const forbidden = Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
      { status: 403 }
    );
    mockGuardPlatformApi.mockReturnValue(forbidden);

    const res = await callGet();

    expect(mockGuardPlatformApi).toHaveBeenCalledWith(
      expect.anything(),
      'ops_entity_read'
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when the driver does not exist', async () => {
    installOpsData({ driver: null });

    const res = await callGet();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('DRIVER_NOT_FOUND');
  });

  it('returns readiness, active work, exceptions, compliance, payout, and payable balance', async () => {
    const res = await callGet();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.driver.id).toBe(DRIVER_ID);
    expect(body.data.readiness.status).toBe('not_dispatchable');
    expect(body.data.activeDeliveryCount).toBe(1);
    expect(body.data.activeDeliveries[0].orderNumber).toBe('RND-1001');
    expect(body.data.openExceptionCount).toBe(2);
    expect(body.data.compliance.openItems).toBe(2);
    expect(body.data.payout.accountStatus).toBe('active');
    expect(body.data.payout.availableBalanceCents).toBe(12550);
    expect(body.data.payout.currency).toBe('CAD');
  });
});
