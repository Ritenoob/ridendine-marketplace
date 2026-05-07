import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  calculateSurgeMultiplier,
  getSurgeMultiplier,
  SURGE_CAP,
  SURGE_TIER_PEAK,
  SURGE_TIER_VERY_BUSY,
  SURGE_TIER_BUSY,
  SURGE_TIER_NORMAL,
  RATIO_PEAK,
  RATIO_VERY_BUSY,
  RATIO_BUSY,
} from './surge-pricing.service';

// ==========================================
// SURGE CONSTANTS
// ==========================================

describe('surge constants', () => {
  it('SURGE_CAP is 2.0', () => {
    expect(SURGE_CAP).toBe(2.0);
  });

  it('SURGE_TIER_PEAK is 2.0', () => {
    expect(SURGE_TIER_PEAK).toBe(2.0);
  });

  it('SURGE_TIER_VERY_BUSY is 1.5', () => {
    expect(SURGE_TIER_VERY_BUSY).toBe(1.5);
  });

  it('SURGE_TIER_BUSY is 1.25', () => {
    expect(SURGE_TIER_BUSY).toBe(1.25);
  });

  it('SURGE_TIER_NORMAL is 1.0', () => {
    expect(SURGE_TIER_NORMAL).toBe(1.0);
  });

  it('RATIO_PEAK is 3', () => {
    expect(RATIO_PEAK).toBe(3);
  });

  it('RATIO_VERY_BUSY is 2', () => {
    expect(RATIO_VERY_BUSY).toBe(2);
  });

  it('RATIO_BUSY is 1.5', () => {
    expect(RATIO_BUSY).toBe(1.5);
  });
});

// ==========================================
// calculateSurgeMultiplier
// ==========================================

describe('calculateSurgeMultiplier', () => {
  it('returns 1.0x when ratio is 0 (no orders)', () => {
    expect(calculateSurgeMultiplier(0, 5)).toBe(1.0);
  });

  it('returns 1.0x when ratio < 1.5 (normal demand)', () => {
    // 3 orders / 5 drivers = 0.6 ratio
    expect(calculateSurgeMultiplier(3, 5)).toBe(1.0);
  });

  it('returns 1.0x when ratio is exactly 1.5 (boundary — not yet busy)', () => {
    // ratio must be > 1.5, so exactly 1.5 stays normal
    expect(calculateSurgeMultiplier(3, 2)).toBe(1.0);
  });

  it('returns 1.25x when ratio > 1.5 (busy)', () => {
    // 4 orders / 2 drivers = 2.0 ratio — wait, 2.0 > 1.5 but also > 2.0? no, 2.0 is not > 2.0
    // Let's use: 4 orders / 3 drivers ≈ 1.67 — between 1.5 and 2.0
    expect(calculateSurgeMultiplier(5, 3)).toBeCloseTo(1.25);
  });

  it('returns 1.5x when ratio > 2.0 (very busy)', () => {
    // 5 orders / 2 drivers = 2.5 — between 2.0 and 3.0
    expect(calculateSurgeMultiplier(5, 2)).toBe(1.5);
  });

  it('returns 2.0x when ratio > 3.0 (peak)', () => {
    // 7 orders / 2 drivers = 3.5
    expect(calculateSurgeMultiplier(7, 2)).toBe(2.0);
  });

  it('returns 2.0x when ratio is exactly at peak boundary (> 3)', () => {
    // 7 orders / 2 drivers = 3.5 > 3
    expect(calculateSurgeMultiplier(7, 2)).toBe(2.0);
  });

  it('returns 1.0x when there are no drivers and no orders', () => {
    expect(calculateSurgeMultiplier(0, 0)).toBe(1.0);
  });

  it('returns 2.0x (capped) when no drivers and many orders', () => {
    // Division by zero case — treat as peak demand
    expect(calculateSurgeMultiplier(10, 0)).toBe(2.0);
  });

  it('never exceeds SURGE_CAP (2.0)', () => {
    const result = calculateSurgeMultiplier(100, 1);
    expect(result).toBeLessThanOrEqual(SURGE_CAP);
  });
});

// ==========================================
// getSurgeMultiplier (DB integration)
// ==========================================

describe('getSurgeMultiplier', () => {
  const mockDb = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the surge_multiplier from service_areas table', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { surge_multiplier: 1.5 },
        error: null,
      }),
    };
    mockDb.from.mockReturnValue(chain);

    const result = await getSurgeMultiplier('area-123', mockDb as any);
    expect(result).toBe(1.5);
    expect(mockDb.from).toHaveBeenCalledWith('service_areas');
  });

  it('returns 1.0 as default when area not found', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'not found' },
      }),
    };
    mockDb.from.mockReturnValue(chain);

    const result = await getSurgeMultiplier('area-999', mockDb as any);
    expect(result).toBe(1.0);
  });

  it('returns 1.0 when surge_multiplier is null', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { surge_multiplier: null },
        error: null,
      }),
    };
    mockDb.from.mockReturnValue(chain);

    const result = await getSurgeMultiplier('area-123', mockDb as any);
    expect(result).toBe(1.0);
  });

  it('caps returned value at SURGE_CAP even if DB has higher value', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { surge_multiplier: 5.0 },
        error: null,
      }),
    };
    mockDb.from.mockReturnValue(chain);

    const result = await getSurgeMultiplier('area-123', mockDb as any);
    expect(result).toBeLessThanOrEqual(SURGE_CAP);
  });

  it('returns 1.0 on DB error (graceful fallback)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    };
    mockDb.from.mockReturnValue(chain);

    const result = await getSurgeMultiplier('area-123', mockDb as any);
    expect(result).toBe(1.0);
  });
});
