// ==========================================
// SURGE PRICING SERVICE
// Demand-based delivery fee multiplier
// ==========================================

// Surge tier multipliers
export const SURGE_TIER_NORMAL = 1.0;
export const SURGE_TIER_BUSY = 1.25;
export const SURGE_TIER_VERY_BUSY = 1.5;
export const SURGE_TIER_PEAK = 2.0;
export const SURGE_CAP = 2.0;

// Orders-to-drivers ratio thresholds
export const RATIO_BUSY = 1.5;
export const RATIO_VERY_BUSY = 2;
export const RATIO_PEAK = 3;

interface DbClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: { surge_multiplier: number | null } | null; error: unknown }>;
      };
    };
  };
}

/**
 * Determine surge multiplier from active orders and available drivers.
 * Returns 1.0–2.0 based on demand ratio.
 */
export function calculateSurgeMultiplier(
  activeOrders: number,
  availableDrivers: number
): number {
  if (availableDrivers === 0) {
    return activeOrders > 0 ? SURGE_TIER_PEAK : SURGE_TIER_NORMAL;
  }

  const ratio = activeOrders / availableDrivers;

  if (ratio > RATIO_PEAK) return SURGE_TIER_PEAK;
  if (ratio > RATIO_VERY_BUSY) return SURGE_TIER_VERY_BUSY;
  if (ratio > RATIO_BUSY) return SURGE_TIER_BUSY;
  return SURGE_TIER_NORMAL;
}

/**
 * Fetch current surge multiplier for a service area from the DB.
 * Falls back to 1.0 (no surge) on any error.
 */
export async function getSurgeMultiplier(
  serviceAreaId: string,
  db: DbClient
): Promise<number> {
  try {
    const { data, error } = await db
      .from('service_areas')
      .select('surge_multiplier')
      .eq('id', serviceAreaId)
      .single();

    if (error || !data || data.surge_multiplier === null) {
      return SURGE_TIER_NORMAL;
    }

    return Math.min(data.surge_multiplier, SURGE_CAP);
  } catch {
    return SURGE_TIER_NORMAL;
  }
}
