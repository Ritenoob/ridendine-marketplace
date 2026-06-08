import { createEmptyLiveFeedState, liveFeedReducer } from '@/lib/ops-live-feed-reducer';
import { buildOpsLiveDriverViews } from '@/hooks/use-ops-live-feed';
import type { OpsLiveDriverSnapshot, OpsLiveOrderSnapshot } from '@/lib/ops-live-feed-types';
import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';

const baseOrder = (over: Partial<OpsLiveOrderSnapshot>): OpsLiveOrderSnapshot => ({
  id: 'o1',
  order_number: '100',
  engine_status: 'pending',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  estimated_ready_at: null,
  ready_at: null,
  prep_started_at: null,
  storefront_id: 's1',
  customer_id: 'c1',
  chef_name: 'Chef',
  customer_name: 'Pat',
  delivery: null,
  ...over,
});

const baseDriver = (over: Partial<OpsLiveDriverSnapshot>): OpsLiveDriverSnapshot => ({
  id: 'd1',
  first_name: 'A',
  last_name: 'B',
  driver_status: 'approved',
  updated_at: '2026-06-08T00:00:00.000Z',
  payoutConnected: true,
  complianceOpenItems: 0,
  presence: {
    status: 'online',
    updated_at: '2026-06-08T00:00:00.000Z',
    current_lat: 1,
    current_lng: 2,
    last_location_lat: null,
    last_location_lng: null,
    last_location_at: null,
    last_location_update: '2026-06-08T00:00:00.000Z',
  },
  ...over,
});

describe('buildOpsLiveDriverViews', () => {
  it('recomputes readiness from current presence and active work instead of stale snapshots', () => {
    const views = buildOpsLiveDriverViews({
      drivers: [
        baseDriver({
          readiness: {
            status: 'ready',
            label: 'Ready',
            detail: 'Old snapshot readiness',
            blocksDispatch: false,
            priority: 'success',
          },
          presence: {
            status: 'offline',
            updated_at: '2026-06-08T00:01:00.000Z',
            current_lat: null,
            current_lng: null,
            last_location_lat: null,
            last_location_lng: null,
            last_location_at: null,
            last_location_update: null,
          },
        }),
      ],
      orders: [
        baseOrder({
          delivery: {
            id: 'del-1',
            order_id: 'o1',
            status: 'accepted',
            driver_id: 'd1',
            updated_at: '2026-06-08T00:01:00.000Z',
            estimated_dropoff_at: null,
            escalated_to_ops: null,
            assignment_attempts_count: null,
            pickup_lat: null,
            pickup_lng: null,
            dropoff_lat: null,
            dropoff_lng: null,
            pickup_address: '',
            dropoff_address: '',
          },
        }),
      ],
      now: new Date('2026-06-08T00:01:30.000Z'),
    });

    expect(views[0].readiness.status).toBe('active_delivery_risk');
    expect(views[0].readiness.detail).toMatch(/active delivery/i);
  });

  it('counts arrived pickup deliveries as active live-board work', () => {
    const views = buildOpsLiveDriverViews({
      drivers: [baseDriver({})],
      orders: [
        baseOrder({
          delivery: {
            id: 'del-1',
            order_id: 'o1',
            status: 'arrived_at_pickup',
            driver_id: 'd1',
            updated_at: '2026-06-08T00:01:00.000Z',
            estimated_dropoff_at: null,
            escalated_to_ops: null,
            assignment_attempts_count: null,
            pickup_lat: null,
            pickup_lng: null,
            dropoff_lat: null,
            dropoff_lng: null,
            pickup_address: '',
            dropoff_address: '',
          },
        }),
      ],
      now: new Date('2026-06-08T00:01:30.000Z'),
    });

    expect(views[0].activeDeliveryCount).toBe(1);
    expect(views[0].currentDeliveryId).toBe('del-1');
  });

  it('uses live-board compliance and payout inputs when computing readiness', () => {
    const views = buildOpsLiveDriverViews({
      drivers: [baseDriver({ complianceOpenItems: 1, payoutConnected: false })],
      orders: [],
      now: new Date('2026-06-08T00:00:30.000Z'),
    });

    expect(views[0].readiness.status).toBe('not_dispatchable');
    expect(views[0].readiness.detail).toMatch(/compliance/i);
  });
});

describe('liveFeedReducer', () => {
  it('hydrates and deduplicates by order id', () => {
    let s = createEmptyLiveFeedState();
    const o = baseOrder({ id: 'o1' });
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: { orders: [o, { ...o, order_number: 'dup' }], drivers: [], chefs: [] },
    });
    expect(s.ordersById.size).toBe(1);
    expect(s.ordersById.get('o1')?.order_number).toBe('dup');
  });

  it('merges sequential order updates without duplicate rows', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: { orders: [baseOrder({ id: 'o1', updated_at: '2020-01-01T00:00:00Z' })], drivers: [], chefs: [] },
    });
    s = liveFeedReducer(s, {
      type: 'ORDER_PATCH',
      row: { id: 'o1', updated_at: '2025-01-02T00:00:00Z', engine_status: 'preparing' },
    });
    expect(s.ordersById.size).toBe(1);
    expect(s.ordersById.get('o1')?.engine_status).toBe('preparing');
  });

  it('ignores stale order updates', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [baseOrder({ id: 'o1', engine_status: 'ready', updated_at: '2025-06-01T12:00:00Z' })],
        drivers: [],
        chefs: [],
      },
    });
    s = liveFeedReducer(s, {
      type: 'ORDER_PATCH',
      row: { id: 'o1', engine_status: 'pending', updated_at: '2025-01-01T00:00:00Z' },
    });
    expect(s.ordersById.get('o1')?.engine_status).toBe('ready');
  });

  it('moves order public stage when engine_status changes', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [baseOrder({ id: 'o1', engine_status: 'pending', updated_at: '2025-01-01T00:00:00Z' })],
        drivers: [],
        chefs: [],
      },
    });
    expect(mapEngineStatusToPublicStage(s.ordersById.get('o1')!.engine_status)).toBe(PublicOrderStage.PLACED);
    s = liveFeedReducer(s, {
      type: 'ORDER_PATCH',
      row: { id: 'o1', engine_status: 'preparing', updated_at: '2025-01-02T00:00:00Z' },
    });
    expect(mapEngineStatusToPublicStage(s.ordersById.get('o1')!.engine_status)).toBe(PublicOrderStage.COOKING);
  });

  it('merges driver presence without duplicating drivers', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [],
        drivers: [
          {
            id: 'd1',
            first_name: 'A',
            last_name: 'B',
            driver_status: 'approved',
            updated_at: '2025-01-01T00:00:00Z',
            presence: {
              status: 'offline',
              updated_at: '2025-01-01T00:00:00Z',
              current_lat: null,
              current_lng: null,
              last_location_lat: null,
              last_location_lng: null,
              last_location_at: null,
              last_location_update: null,
            },
          },
        ],
        chefs: [],
      },
    });
    s = liveFeedReducer(s, {
      type: 'DRIVER_PRESENCE_PATCH',
      row: {
        driver_id: 'd1',
        status: 'online',
        updated_at: '2025-01-02T00:00:00Z',
        current_lat: 1,
        current_lng: 2,
      },
    });
    expect(s.driversById.size).toBe(1);
    expect(s.driversById.get('d1')?.presence?.status).toBe('online');
    expect(s.driversById.get('d1')?.presence?.current_lat).toBe(1);
  });

  it('updates chef queue fields deterministically', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [],
        drivers: [],
        chefs: [
          {
            id: 'sf1',
            name: 'Store',
            chef_display_name: 'Chef',
            storefront_state: 'open',
            is_paused: false,
            current_queue_size: 1,
            max_queue_size: 10,
            is_overloaded: false,
            estimated_prep_time_max: 45,
            updated_at: '2025-01-01T00:00:00Z',
          },
        ],
      },
    });
    s = liveFeedReducer(s, {
      type: 'CHEF_PATCH',
      row: { id: 'sf1', current_queue_size: 5, updated_at: '2025-01-02T00:00:00Z' },
    });
    expect(s.chefsById.get('sf1')?.current_queue_size).toBe(5);
  });

  // Audit gap #4 — DELIVERY_PATCH was previously uncovered (docs/OPS_LIVE_BOARD_AUDIT_2026-05-18.md).
  it('attaches a delivery to the matching order via DELIVERY_PATCH', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [baseOrder({ id: 'o1', updated_at: '2025-01-01T00:00:00Z' })],
        drivers: [],
        chefs: [],
      },
    });
    s = liveFeedReducer(s, {
      type: 'DELIVERY_PATCH',
      row: {
        id: 'del-1',
        order_id: 'o1',
        status: 'accepted',
        driver_id: 'd1',
        updated_at: '2025-01-02T00:00:00Z',
        pickup_address: '123 Pickup',
        dropoff_address: '456 Dropoff',
      },
    });
    const order = s.ordersById.get('o1');
    expect(order?.delivery?.id).toBe('del-1');
    expect(order?.delivery?.status).toBe('accepted');
    expect(order?.delivery?.driver_id).toBe('d1');
  });

  it('ignores DELIVERY_PATCH when the parent order is unknown', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: { orders: [], drivers: [], chefs: [] },
    });
    s = liveFeedReducer(s, {
      type: 'DELIVERY_PATCH',
      row: {
        id: 'del-orphan',
        order_id: 'o-missing',
        status: 'accepted',
        driver_id: 'd1',
        updated_at: '2025-01-02T00:00:00Z',
        pickup_address: 'a',
        dropoff_address: 'b',
      },
    });
    expect(s.ordersById.size).toBe(0);
  });

  it('ignores stale DELIVERY_PATCH by updated_at', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [
          {
            ...baseOrder({ id: 'o1', updated_at: '2025-06-01T00:00:00Z' }),
            delivery: {
              id: 'del-1',
              order_id: 'o1',
              status: 'picked_up',
              driver_id: 'd1',
              updated_at: '2025-06-01T12:00:00Z',
              estimated_dropoff_at: null,
              escalated_to_ops: null,
              assignment_attempts_count: null,
              pickup_lat: null,
              pickup_lng: null,
              dropoff_lat: null,
              dropoff_lng: null,
              pickup_address: '',
              dropoff_address: '',
            },
          },
        ],
        drivers: [],
        chefs: [],
      },
    });
    s = liveFeedReducer(s, {
      type: 'DELIVERY_PATCH',
      row: {
        id: 'del-1',
        order_id: 'o1',
        status: 'accepted',
        driver_id: 'd1',
        updated_at: '2025-01-01T00:00:00Z',
        pickup_address: '',
        dropoff_address: '',
      },
    });
    expect(s.ordersById.get('o1')?.delivery?.status).toBe('picked_up');
  });
});
