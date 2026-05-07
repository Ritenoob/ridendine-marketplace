import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EtaService } from '../eta.service';
import type { RoutingProvider } from '../provider';
import type { Point, Route } from '../types';

function makeFakeProvider(routes: Route[]): RoutingProvider {
  let i = 0;
  return {
    id: 'osrm',
    async route(): Promise<Route> {
      const r = routes[Math.min(i++, routes.length - 1)]!;
      return {
        meters: r.meters,
        seconds: r.seconds,
        polyline: r.polyline,
        legs:
          r.legs.length > 0
            ? r.legs
            : [{ meters: r.meters, seconds: r.seconds, from: { lat: 0, lng: 0 }, to: { lat: 1, lng: 1 } }],
      };
    },
    async matrix(sources: Point[], targets: Point[]) {
      return {
        sources: [...sources],
        targets: [...targets],
        durations: sources.map((_, idx) => [idx + 10]),
      };
    },
  };
}

function chainMock(rows: Record<string, unknown>[]) {
  const state = { idx: 0 };
  const build = () => {
    const row = rows[state.idx] ?? rows[rows.length - 1]!;
    state.idx++;
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null }),
          single: async () => ({ data: row, error: null }),
        }),
        maybeSingle: async () => ({ data: row, error: null }),
      }),
    };
  };
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: build().select().eq().maybeSingle,
          single: build().select().eq().single,
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
  };
}

describe('EtaService.estimatePreOrder', () => {
  function makeProvider(seconds: number): RoutingProvider {
    return {
      id: 'osrm',
      async route(): Promise<Route> {
        return {
          meters: 5000,
          seconds,
          polyline: 'abc',
          legs: [{ meters: 5000, seconds, from: { lat: 0, lng: 0 }, to: { lat: 1, lng: 1 } }],
        };
      },
      async matrix(sources: Point[], targets: Point[]) {
        return { sources, targets, durations: [[seconds]] };
      },
    };
  }

  function makeDb(opts: {
    storefrontKitchenId?: string | null;
    kitchenLat?: number | null;
    kitchenLng?: number | null;
    addressLat?: number | null;
    addressLng?: number | null;
    prepTimeMin?: number | null;
    prepTimeMax?: number | null;
  }) {
    return {
      from: (table: string) => {
        if (table === 'chef_storefronts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    kitchen_id: opts.storefrontKitchenId ?? 'k1',
                    estimated_prep_time_min: opts.prepTimeMin ?? null,
                    estimated_prep_time_max: opts.prepTimeMax ?? null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'chef_kitchens') {
          const kitLat = 'kitchenLat' in opts ? opts.kitchenLat : 43.65;
          const kitLng = 'kitchenLng' in opts ? opts.kitchenLng : -79.4;
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { lat: kitLat, lng: kitLng },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'customer_addresses') {
          const addrLat = 'addressLat' in opts ? opts.addressLat : 43.7;
          const addrLng = 'addressLng' in opts ? opts.addressLng : -79.45;
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { lat: addrLat, lng: addrLng },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;
  }

  it('returns minMinutes and maxMinutes based on prep time and drive time', async () => {
    const driveSeconds = 600; // 10 min
    const provider = makeProvider(driveSeconds);
    const db = makeDb({ prepTimeMin: 15, prepTimeMax: 25 });
    const eta = new EtaService(provider, db);

    const result = await eta.estimatePreOrder('sf1', 'addr1');

    // prepTime midpoint 20 + driveTime 10 + buffer 5 = 35 min
    // range ±5: 30-40 min
    expect(result.minMinutes).toBeLessThan(result.maxMinutes);
    expect(result.minMinutes).toBeGreaterThan(0);
    expect(result.maxMinutes - result.minMinutes).toBe(10); // ±5 = 10 spread
    expect(result.prepTime).toBeGreaterThan(0);
    expect(result.driveTime).toBe(10);
  });

  it('falls back to default 30-45 when routing fails', async () => {
    const provider: RoutingProvider = {
      id: 'osrm',
      async route() { throw new Error('Network error'); },
      async matrix() { throw new Error('Network error'); },
    };
    const db = makeDb({});
    const eta = new EtaService(provider, db);

    const result = await eta.estimatePreOrder('sf1', 'addr1');

    expect(result.minMinutes).toBe(30);
    expect(result.maxMinutes).toBe(45);
  });

  it('falls back to default 30-45 when kitchen coords are missing', async () => {
    const provider = makeProvider(600);
    const db = makeDb({ kitchenLat: null, kitchenLng: null });
    const eta = new EtaService(provider, db);

    const result = await eta.estimatePreOrder('sf1', 'addr1');

    expect(result.minMinutes).toBe(30);
    expect(result.maxMinutes).toBe(45);
  });

  it('falls back to default 30-45 when address coords are missing', async () => {
    const provider = makeProvider(600);
    const db = makeDb({ addressLat: null, addressLng: null });
    const eta = new EtaService(provider, db);

    const result = await eta.estimatePreOrder('sf1', 'addr1');

    expect(result.minMinutes).toBe(30);
    expect(result.maxMinutes).toBe(45);
  });

  it('uses default prep time of 20 min when storefront has no prep time set', async () => {
    const driveSeconds = 0;
    const provider = makeProvider(driveSeconds);
    const db = makeDb({ prepTimeMin: null, prepTimeMax: null });
    const eta = new EtaService(provider, db);

    const result = await eta.estimatePreOrder('sf1', 'addr1');

    // Default prep 20 + drive 0 + buffer 5 = 25 min => range 20-30
    expect(result.prepTime).toBe(20);
    expect(result.minMinutes).toBe(20);
    expect(result.maxMinutes).toBe(30);
  });
});

describe('EtaService', () => {
  it('computeInitial writes dropoff columns', async () => {
    const route: Route = {
      meters: 5000,
      seconds: 600,
      polyline: 'qqq',
      legs: [],
    };
    const provider = makeFakeProvider([route]);
    const updates: Record<string, unknown>[] = [];
    const db = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'o1', storefront_id: 'sf1', delivery_address_id: 'a1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'deliveries') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'd1',
                    pickup_lat: 43.65,
                    pickup_lng: -79.4,
                    dropoff_lat: 43.7,
                    dropoff_lng: -79.45,
                  },
                  error: null,
                }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              updates.push(payload);
              return {
                eq: () => Promise.resolve({ error: null }),
              };
            },
          };
        }
        if (table === 'chef_storefronts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      },
    } as unknown as SupabaseClient;

    const eta = new EtaService(provider, db);
    await eta.computeInitial('o1');

    expect(updates[0]).toMatchObject({
      route_to_dropoff_polyline: 'qqq',
      route_to_dropoff_meters: 5000,
      route_to_dropoff_seconds: 600,
      routing_provider: 'osrm',
    });
    expect(updates[0]?.eta_dropoff_at).toBeDefined();
  });

  it('rankDrivers sorts by ascending seconds', async () => {
    const provider: RoutingProvider = {
      id: 'osrm',
      async route() {
        throw new Error('unused');
      },
      async matrix(sources: Point[]) {
        return {
          sources: [...sources],
          targets: [{ lat: 0, lng: 0 }],
          durations: [[100], [50], [200]],
        };
      },
    };

    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { pickup_lat: 43, pickup_lng: -79 },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const eta = new EtaService(provider, db);
    const ranked = await eta.rankDrivers('d1', [
      { driverId: 'a', point: { lat: 1, lng: 1 } },
      { driverId: 'b', point: { lat: 2, lng: 2 } },
      { driverId: 'c', point: { lat: 3, lng: 3 } },
    ]);
    expect(ranked.map((r) => r.driverId).join(',')).toBe('b,a,c');
  });
});
