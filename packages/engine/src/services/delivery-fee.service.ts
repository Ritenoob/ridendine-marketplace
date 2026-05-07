// ==========================================
// DELIVERY FEE SERVICE
// Distance-based delivery fee calculation
// All amounts in cents internally
// ==========================================

import type { Coordinates } from './geocoding.service';

// Fee tier constants
export const DELIVERY_BASE_FEE_CENTS = 399;     // $3.99
export const DELIVERY_PER_KM_CENTS = 50;        // $0.50/km
export const DELIVERY_MAX_FEE_CENTS = 999;      // $9.99 cap
export const SMALL_ORDER_THRESHOLD_CENTS = 1500; // $15.00
export const SMALL_ORDER_SURCHARGE_CENTS = 200;  // $2.00

const ROAD_FACTOR = 1.3;
const EARTH_RADIUS_KM = 6371;

export interface DeliveryFeeBreakdown {
  baseFee: number;
  distanceFee: number;
  smallOrderSurcharge: number;
}

export interface DeliveryFeeResult {
  feeCents: number;
  breakdown: DeliveryFeeBreakdown;
}

/**
 * Calculate delivery fee based on distance and order subtotal.
 * Formula: base fee + per-km fee, capped at max, plus small order surcharge.
 */
export function calculateDeliveryFee(
  distanceKm: number,
  subtotalCents: number
): DeliveryFeeResult {
  const baseFee = DELIVERY_BASE_FEE_CENTS;
  const distanceFee = Math.round(distanceKm * DELIVERY_PER_KM_CENTS);
  const smallOrderSurcharge =
    subtotalCents < SMALL_ORDER_THRESHOLD_CENTS ? SMALL_ORDER_SURCHARGE_CENTS : 0;

  const rawFee = baseFee + distanceFee + smallOrderSurcharge;
  const feeCents = Math.min(rawFee, DELIVERY_MAX_FEE_CENTS);

  return {
    feeCents,
    breakdown: { baseFee, distanceFee, smallOrderSurcharge },
  };
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Estimate delivery distance in km.
 * - If `routeMeters` (OSRM actual data) is supplied, converts it directly.
 * - Otherwise uses Haversine × 1.3 road factor as a pre-checkout estimate.
 */
export function estimateDistance(
  from: Coordinates,
  to: Coordinates,
  routeMeters?: number
): number {
  if (routeMeters !== undefined) {
    return routeMeters / 1000;
  }
  const straightLine = haversineKm(from, to);
  return straightLine * ROAD_FACTOR;
}
