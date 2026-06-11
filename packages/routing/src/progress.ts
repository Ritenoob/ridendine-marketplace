import { decodePolyline } from './polyline';
import type { Point } from './types';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function distMeters(a: Point, b: Point): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Closest point on the polyline (piecewise linear) to `point`.
 * Returns one endpoint if fewer than 2 route points.
 */
export function snapToRoute(point: Point, routePoints: Point[]): Point {
  if (!routePoints.length) return { ...point };
  if (routePoints.length === 1) return { ...routePoints[0]! };

  let best: Point = { ...routePoints[0]! };
  let bestD = Number.POSITIVE_INFINITY;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const a = routePoints[i]!;
    const b = routePoints[i + 1]!;
    const snapped = closestOnSegment(point, a, b);
    const d = distMeters(point, snapped);
    if (d < bestD) {
      bestD = d;
      best = snapped;
    }
  }

  return best;
}

function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const t = closestTOnSegment(p, a, b);
  return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
}

/**
 * Progress 0–100 along decoded polyline from start to closest projection of `point`.
 */
export function computeProgressPct(point: Point, polyline: string): number {
  const trimmed = (polyline ?? '').trim();
  if (!trimmed) return 0;

  const pts = decodePolyline(trimmed);
  if (pts.length < 2) return 0;

  let total = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distMeters(pts[i]!, pts[i + 1]!);
    segLens.push(d);
    total += d;
  }

  if (total <= 0) return 0;

  let bestDist = Number.POSITIVE_INFINITY;
  let alongBest = 0;
  let cum = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const segLen = segLens[i] ?? 0;
    const t = closestTOnSegment(point, a, b);
    const proj = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
    const d = distMeters(point, proj);
    if (d < bestDist) {
      bestDist = d;
      alongBest = cum + t * segLen;
    }
    cum += segLen;
  }

  const pct = (alongBest / total) * 100;
  return clamp(pct, 0, 100);
}

function closestTOnSegment(p: Point, a: Point, b: Point): number {
  // Project in an equirectangular approximation: one degree of longitude spans
  // cos(latitude) times the distance of one degree of latitude, so scale the
  // lng axis by cos(mean lat) — otherwise east-west deltas are over-weighted
  // (~37% at 43°N) and projections snap to the wrong segment point.
  const latScale = Math.cos((((a.lat + b.lat + p.lat) / 3) * Math.PI) / 180);
  const ax = a.lng * latScale;
  const ay = a.lat;
  const bx = b.lng * latScale;
  const by = b.lat;
  const px = p.lng * latScale;
  const py = p.lat;
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return 0;
  return clamp((apx * abx + apy * aby) / ab2, 0, 1);
}

export function estimateRemainingSeconds(progressPct: number, totalSeconds: number): number {
  const p = clamp(progressPct, 0, 100);
  const t = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const rem = Math.round(t * (1 - p / 100));
  return Math.max(0, rem);
}
