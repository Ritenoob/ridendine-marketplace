// ==========================================
// LOYALTY SERVICE — Points earning and redemption
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
} as const;

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

/** 1 point = $0.10 discount = 10 cents */
const CENTS_PER_POINT = 10;

/** 1 point per $1 spent (base rate) */
const POINTS_PER_DOLLAR = 1;

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

export function computeTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= TIER_THRESHOLDS.gold) return 'gold';
  if (lifetimePoints >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function computeMultiplier(tier: LoyaltyTier): number {
  if (tier === 'gold') return 1.5;
  if (tier === 'silver') return 1.25;
  return 1;
}

export function computePointsEarned(orderTotalCents: number, tier: LoyaltyTier): number {
  const dollars = orderTotalCents / 100;
  const basePoints = Math.floor(dollars * POINTS_PER_DOLLAR);
  return Math.floor(basePoints * computeMultiplier(tier));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoyaltyAccount = {
  id: string;
  customer_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: LoyaltyTier;
  created_at?: string;
  updated_at?: string;
};

export type LoyaltyBalance = {
  pointsBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  nextTierPoints: number | null;
};

export type EarnResult = {
  pointsEarned: number;
  newBalance: number;
  tier: LoyaltyTier;
};

export type RedeemResult = {
  discountCents: number;
  pointsRedeemed: number;
  newBalance: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class LoyaltyService {
  constructor(private readonly client: SupabaseClient) {}

  async getOrCreateAccount(customerId: string): Promise<LoyaltyAccount> {
    const { data: existing } = await (this.client as any)
      .from('loyalty_accounts')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existing) {
      return existing as LoyaltyAccount;
    }

    const { data: created, error } = await (this.client as any)
      .from('loyalty_accounts')
      .insert({ customer_id: customerId, points_balance: 0, lifetime_points: 0, tier: 'bronze' })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create loyalty account: ${error.message}`);
    return created as LoyaltyAccount;
  }

  async getBalance(customerId: string): Promise<LoyaltyBalance> {
    const account = await this.getOrCreateAccount(customerId);
    const nextTierPoints = computeNextTierPoints(account.lifetime_points);
    return {
      pointsBalance: account.points_balance,
      lifetimePoints: account.lifetime_points,
      tier: account.tier as LoyaltyTier,
      nextTierPoints,
    };
  }

  async earnPoints(customerId: string, orderId: string, orderTotalCents: number): Promise<EarnResult> {
    const account = await this.getOrCreateAccount(customerId);
    const tier = account.tier as LoyaltyTier;
    const pointsEarned = computePointsEarned(orderTotalCents, tier);

    if (pointsEarned === 0) {
      return { pointsEarned: 0, newBalance: account.points_balance, tier };
    }

    const newBalance = account.points_balance + pointsEarned;
    const newLifetime = account.lifetime_points + pointsEarned;
    const newTier = computeTier(newLifetime);

    await (this.client as any)
      .from('loyalty_accounts')
      .update({ points_balance: newBalance, lifetime_points: newLifetime, tier: newTier })
      .eq('id', account.id);

    await (this.client as any)
      .from('loyalty_transactions')
      .insert({
        loyalty_account_id: account.id,
        order_id: orderId,
        points: pointsEarned,
        type: 'earn',
        description: `Earned ${pointsEarned} points on order`,
      })
      .select('*')
      .single();

    return { pointsEarned, newBalance, tier: newTier };
  }

  async redeemPoints(customerId: string, points: number): Promise<RedeemResult> {
    const account = await this.getOrCreateAccount(customerId);

    if (account.points_balance < points) {
      throw new Error(`Insufficient points: have ${account.points_balance}, need ${points}`);
    }

    const newBalance = account.points_balance - points;
    const discountCents = points * CENTS_PER_POINT;

    await (this.client as any)
      .from('loyalty_accounts')
      .update({ points_balance: newBalance })
      .eq('id', account.id);

    await (this.client as any)
      .from('loyalty_transactions')
      .insert({
        loyalty_account_id: account.id,
        order_id: null,
        points: -points,
        type: 'redeem',
        description: `Redeemed ${points} points for $${(discountCents / 100).toFixed(2)} discount`,
      })
      .select('*')
      .single();

    return { discountCents, pointsRedeemed: points, newBalance };
  }
}

function computeNextTierPoints(lifetimePoints: number): number | null {
  if (lifetimePoints < TIER_THRESHOLDS.silver) {
    return TIER_THRESHOLDS.silver - lifetimePoints;
  }
  if (lifetimePoints < TIER_THRESHOLDS.gold) {
    return TIER_THRESHOLDS.gold - lifetimePoints;
  }
  return null; // already gold
}

export function createLoyaltyService(client: SupabaseClient): LoyaltyService {
  return new LoyaltyService(client);
}
