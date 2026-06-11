// ==========================================
// DRIVER SCORING UTILITIES
// Pure scoring functions for dispatch prioritization
// Extracted from ops.repository.ts (FND-007)
// ==========================================

/**
 * Driver snapshot used for scoring (minimal interface to avoid type coupling)
 */
export interface DriverScoreInput {
  distanceKm: number | null;
  activeDeliveries: number;
  recentDeclines: number;
  recentExpiries: number;
  fairnessScore: number;
  status: string;
}

/**
 * Dispatch scoring rules
 */
export interface DispatchScoringRules {
  dispatchRadiusKm: number;
}

/**
 * Score a driver for dispatch assignment priority.
 * Higher score = more suitable for the next delivery.
 *
 * NOTE: This is NOT the dispatch-authoritative implementation. The engine's
 * `calculateDriverAssignmentScore` (packages/engine) is the source of truth
 * for actual dispatch decisions; this utility exists for display/diagnostic
 * use (e.g. ops dashboards). If you change scoring behavior, change the
 * engine implementation — do not let the two drift further apart.
 *
 * Factors:
 * - Distance from pickup (closer = higher score, max 12pts/km)
 * - Workload penalty (-20 per active delivery)
 * - Decline penalty (-8 per recent decline)
 * - Expiry penalty (-10 per recent expiry)
 * - Fairness bonus (+10 * fairness score)
 * - Availability bonus (+20 online, -25 busy, -50 other)
 */
export function scoreDriverForDispatch(
  driver: DriverScoreInput,
  rules: DispatchScoringRules
): number {
  const distanceScore =
    driver.distanceKm == null
      ? 0
      : Math.max(0, (rules.dispatchRadiusKm - driver.distanceKm) * 12);
  const workloadPenalty = driver.activeDeliveries * 20;
  const declinePenalty = driver.recentDeclines * 8;
  const expiryPenalty = driver.recentExpiries * 10;
  const fairnessBonus = driver.fairnessScore * 10;
  const availabilityBonus =
    driver.status === 'online' ? 20 : driver.status === 'busy' ? -25 : -50;
  return Math.round(
    distanceScore + fairnessBonus + availabilityBonus - workloadPenalty - declinePenalty - expiryPenalty
  );
}
