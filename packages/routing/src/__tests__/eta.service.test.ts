import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EtaService } from '../eta.service';
import { encodePolyline } from '../polyline';
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
    const before = Date.now();
    await eta.computeInitial('o1');
    const after = Date.now();

    expect(updates[0]).toMatchObject({
      route_to_dropoff_polyline: 'qqq',
      route_to_dropoff_meters: 5000,
      route_to_dropoff_seconds: 600,
      routing_provider: 'osrm',
    });
    expect(updates[0]?.eta_dropoff_at).toBeDefined();

    // Initial customer ETA must include prep time (default 20 min) + drive time
    // (600 s), not just the drive leg.
    const etaMs = new Date(updates[0]!.eta_dropoff_at as string).getTime();
    const expectedSeconds = 20 * 60 + 600;
    expect(etaMs).toBeGreaterThanOrEqual(before + (expectedSeconds - 2) * 1000);
    expect(etaMs).toBeLessThanOrEqual(after + (expectedSeconds + 2) * 1000);
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

  it('rankDrivers pushes unreachable (Infinity) candidates to the end', async () => {
    const provider: RoutingProvider = {
      id: 'osrm',
      async route() {
        throw new Error('unused');
      },
      async matrix(sources: Point[]) {
        return {
          sources: [...sources],
          targets: [{ lat: 0, lng: 0 }],
          durations: [[Number.POSITIVE_INFINITY], [50]],
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
      { driverId: 'unreachable', point: { lat: 1, lng: 1 } },
      { driverId: 'reachable', point: { lat: 2, lng: 2 } },
    ]);
    expect(ranked[0]!.driverId).toBe('reachable');
    expect(ranked[0]!.seconds).toBe(50);
    expect(ranked[1]!.driverId).toBe('unreachable');
    expect(ranked[1]!.seconds).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('EtaService.refreshFromDriverPing', () => {
  // Straight north-south route so progress percentages are exact.
  const routePoints = [
    { lat: 0, lng: 0 },
    { lat: 0.1, lng: 0 },
  ];
  const poly = encodePolyline(routePoints);

  function makePingDb(rows: Array<Record<string, unknown>>) {
    let selectIdx = 0;
    const updates: Record<string, unknown>[] = [];
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: rows[Math.min(selectIdx++, rows.length - 1)], error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          updates.push(payload);
          return { eq: () => Promise.resolve({ error: null }) };
        },
      }),
    } as unknown as SupabaseClient;
    return { db, updates };
  }

  const noopProvider: RoutingProvider = {
    id: 'osrm',
    async route() {
      throw new Error('unused');
    },
    async matrix() {
      throw new Error('unused');
    },
  };

  it('does not collapse the ETA across successive pings (remaining = original × (1 − p))', async () => {
    const originalSeconds = 600;

    // Ping 1: driver at 50% of the route; stored row is the original baseline.
    const { db: db1, updates: updates1 } = makePingDb([
      { route_to_dropoff_polyline: poly, route_to_dropoff_seconds: originalSeconds, route_progress_pct: 0 },
    ]);
    const eta1 = new EtaService(noopProvider, db1);
    const r1 = await eta1.refreshFromDriverPing('d1', { lat: 0.05, lng: 0 });

    expect(r1.progressPct).toBeCloseTo(50, 0);
    expect(Math.abs(r1.remainingSeconds - 300)).toBeLessThanOrEqual(3);
    expect(updates1[0]?.route_to_dropoff_seconds).toBe(r1.remainingSeconds);

    // Ping 2: driver at 75% of the route; the DB row now holds the *remaining*
    // seconds and progress written by ping 1. Remaining must be 600 × 0.25 = 150,
    // NOT 600 × 0.5 × 0.25 = 75 (the old multiplicative-decay bug).
    const { db: db2 } = makePingDb([
      {
        route_to_dropoff_polyline: poly,
        route_to_dropoff_seconds: r1.remainingSeconds,
        route_progress_pct: r1.progressPct,
      },
    ]);
    const eta2 = new EtaService(noopProvider, db2);
    const r2 = await eta2.refreshFromDriverPing('d1', { lat: 0.075, lng: 0 });

    expect(r2.progressPct).toBeCloseTo(75, 0);
    expect(Math.abs(r2.remainingSeconds - 150)).toBeLessThanOrEqual(5);
    // Regression guard: the buggy multiplicative decay produced ~75 s here.
    expect(r2.remainingSeconds).toBeGreaterThan(100);
  });

  it('repeated pings from the same position do not decay the ETA', async () => {
    const { db, updates } = makePingDb([
      { route_to_dropoff_polyline: poly, route_to_dropoff_seconds: 600, route_progress_pct: 0 },
      { route_to_dropoff_polyline: poly, route_to_dropoff_seconds: 300, route_progress_pct: 50 },
      { route_to_dropoff_polyline: poly, route_to_dropoff_seconds: 300, route_progress_pct: 50 },
    ]);
    const eta = new EtaService(noopProvider, db);

    const pos = { lat: 0.05, lng: 0 };
    const r1 = await eta.refreshFromDriverPing('d1', pos);
    const r2 = await eta.refreshFromDriverPing('d1', pos);
    const r3 = await eta.refreshFromDriverPing('d1', pos);

    expect(Math.abs(r1.remainingSeconds - 300)).toBeLessThanOrEqual(3);
    expect(Math.abs(r2.remainingSeconds - 300)).toBeLessThanOrEqual(3);
    expect(Math.abs(r3.remainingSeconds - 300)).toBeLessThanOrEqual(3);
    expect(updates.length).toBe(3);
  });
});
