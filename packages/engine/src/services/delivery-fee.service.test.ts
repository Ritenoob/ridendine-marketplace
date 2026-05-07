import { describe, expect, it } from 'vitest';
import {
  calculateDeliveryFee,
  estimateDistance,
  DELIVERY_BASE_FEE_CENTS,
  DELIVERY_PER_KM_CENTS,
  DELIVERY_MAX_FEE_CENTS,
  SMALL_ORDER_THRESHOLD_CENTS,
  SMALL_ORDER_SURCHARGE_CENTS,
} from './delivery-fee.service';
import type { Coordinates } from './geocoding.service';

// ==========================================
// CONSTANTS
// ==========================================

describe('delivery fee constants', () => {
  it('DELIVERY_BASE_FEE_CENTS is 399 ($3.99)', () => {
    expect(DELIVERY_BASE_FEE_CENTS).toBe(399);
  });

  it('DELIVERY_PER_KM_CENTS is 50 ($0.50/km)', () => {
    expect(DELIVERY_PER_KM_CENTS).toBe(50);
  });

  it('DELIVERY_MAX_FEE_CENTS is 999 ($9.99)', () => {
    expect(DELIVERY_MAX_FEE_CENTS).toBe(999);
  });

  it('SMALL_ORDER_THRESHOLD_CENTS is 1500 ($15.00)', () => {
    expect(SMALL_ORDER_THRESHOLD_CENTS).toBe(1500);
  });

  it('SMALL_ORDER_SURCHARGE_CENTS is 200 ($2.00)', () => {
    expect(SMALL_ORDER_SURCHARGE_CENTS).toBe(200);
  });
});

// ==========================================
// calculateDeliveryFee
// ==========================================

describe('calculateDeliveryFee', () => {
  it('calculates base fee for 0km distance', () => {
    const result = calculateDeliveryFee(0, 2000);
    expect(result.feeCents).toBe(399);
    expect(result.breakdown.baseFee).toBe(399);
    expect(result.breakdown.distanceFee).toBe(0);
    expect(result.breakdown.smallOrderSurcharge).toBe(0);
  });

  it('adds per-km fee for a 2km delivery', () => {
    // 399 + (2 * 50) = 499
    const result = calculateDeliveryFee(2, 2000);
    expect(result.feeCents).toBe(499);
    expect(result.breakdown.distanceFee).toBe(100);
  });

  it('caps fee at DELIVERY_MAX_FEE_CENTS (999)', () => {
    // 399 + (50 * 50) = 2899 — should cap at 999
    const result = calculateDeliveryFee(50, 2000);
    expect(result.feeCents).toBe(999);
  });

  it('adds small order surcharge when subtotal < $15', () => {
    // subtotal = 1000 cents ($10), distance = 1km: 399 + 50 = 449 + 200 surcharge = 649
    const result = calculateDeliveryFee(1, 1000);
    expect(result.feeCents).toBe(649);
    expect(result.breakdown.smallOrderSurcharge).toBe(200);
  });

  it('does not add surcharge when subtotal is exactly $15', () => {
    const result = calculateDeliveryFee(1, 1500);
    expect(result.breakdown.smallOrderSurcharge).toBe(0);
    expect(result.feeCents).toBe(449); // 399 + 50
  });

  it('does not add surcharge when subtotal > $15', () => {
    const result = calculateDeliveryFee(1, 2000);
    expect(result.breakdown.smallOrderSurcharge).toBe(0);
  });

  it('caps correctly even when surcharge + distance would exceed max', () => {
    // At 50km: raw = 399 + 2500 + 200 surcharge = 3099 — cap at 999
    const result = calculateDeliveryFee(50, 500);
    expect(result.feeCents).toBe(999);
  });

  it('returns correct breakdown fields', () => {
    const result = calculateDeliveryFee(3, 2000);
    expect(result.breakdown).toHaveProperty('baseFee');
    expect(result.breakdown).toHaveProperty('distanceFee');
    expect(result.breakdown).toHaveProperty('smallOrderSurcharge');
  });

  it('fractional km is handled correctly (1.5km)', () => {
    // 399 + Math.round(1.5 * 50) = 399 + 75 = 474
    const result = calculateDeliveryFee(1.5, 2000);
    expect(result.feeCents).toBe(474);
    expect(result.breakdown.distanceFee).toBe(75);
  });
});

// ==========================================
// calculateDeliveryFee with surgeMultiplier
// ==========================================

describe('calculateDeliveryFee with surgeMultiplier', () => {
  it('applies no change when surgeMultiplier is 1.0', () => {
    const base = calculateDeliveryFee(2, 2000);
    const surged = calculateDeliveryFee(2, 2000, 1.0);
    expect(surged.feeCents).toBe(base.feeCents);
  });

  it('applies surge to distance fee only, not base fee', () => {
    // 2km: distanceFee = 100, baseFee = 399
    // 1.5x surge on distanceFee: 100 * 1.5 = 150 → total = 399 + 150 = 549
    const result = calculateDeliveryFee(2, 2000, 1.5);
    expect(result.feeCents).toBe(549);
    expect(result.breakdown.surgeMultiplier).toBe(1.5);
  });

  it('applies 2.0x surge to distance fee', () => {
    // 2km: distanceFee = 100 * 2.0 = 200, baseFee = 399 → 599
    const result = calculateDeliveryFee(2, 2000, 2.0);
    expect(result.feeCents).toBe(599);
  });

  it('cap still applies after surge', () => {
    // 50km with 2.0x surge would be massive — still capped at 999
    const result = calculateDeliveryFee(50, 2000, 2.0);
    expect(result.feeCents).toBe(999);
  });

  it('defaults to 1.0x surge when not provided', () => {
    const result = calculateDeliveryFee(2, 2000);
    expect(result.breakdown.surgeMultiplier).toBe(1.0);
  });

  it('includes surgeMultiplier in breakdown', () => {
    const result = calculateDeliveryFee(2, 2000, 1.25);
    expect(result.breakdown).toHaveProperty('surgeMultiplier', 1.25);
  });
});

// ==========================================
// estimateDistance (Haversine × 1.3 road factor)
// ==========================================

describe('estimateDistance', () => {
  const hamiltonCenter: Coordinates = { latitude: 43.2557, longitude: -79.8711 };

  it('returns 0 for same coordinates', () => {
    const result = estimateDistance(hamiltonCenter, hamiltonCenter);
    expect(result).toBe(0);
  });

  it('returns a positive number for different coordinates', () => {
    const burlington: Coordinates = { latitude: 43.3255, longitude: -79.7990 };
    const result = estimateDistance(hamiltonCenter, burlington);
    expect(result).toBeGreaterThan(0);
  });

  it('applies 1.3 road factor (result > raw haversine distance)', () => {
    const burlington: Coordinates = { latitude: 43.3255, longitude: -79.7990 };
    const dist = estimateDistance(hamiltonCenter, burlington);
    // Burlington is ~12km straight-line from Hamilton, with 1.3 factor ~15.6km
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(25);
  });

  it('is symmetric (A->B == B->A)', () => {
    const burlington: Coordinates = { latitude: 43.3255, longitude: -79.7990 };
    const dist1 = estimateDistance(hamiltonCenter, burlington);
    const dist2 = estimateDistance(burlington, hamiltonCenter);
    expect(dist1).toBeCloseTo(dist2, 5);
  });

  it('converts route_to_dropoff_meters to km when provided', () => {
    // 5000 meters = 5 km
    const result = estimateDistance(hamiltonCenter, hamiltonCenter, 5000);
    expect(result).toBeCloseTo(5, 1);
  });
});
