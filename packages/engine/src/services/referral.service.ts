// ==========================================
// REFERRAL SERVICE - Referral System Logic
// ==========================================

import type { SupabaseClient } from '@ridendine/db';

export const REFERRAL_REWARD_CENTS = 500; // $5.00
const CODE_LENGTH = 8;
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Types
export interface ReferralCode {
  id: string;
  userId: string;
  userType: 'customer' | 'chef';
  code: string;
  usesCount: number;
  maxUses: number | null;
  rewardCents: number;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralSignup {
  id: string;
  referralCodeId: string;
  referredUserId: string;
  referredUserType: string;
  status: 'pending' | 'completed' | 'rewarded';
  firstOrderId: string | null;
  rewardPaid: boolean;
  createdAt: string;
}

export interface ReferralStats {
  code: string;
  codeId: string;
  isActive: boolean;
  rewardCents: number;
  totalReferrals: number;
  successfulReferrals: number;
  earningsCents: number;
  signups: ReferralSignupSummary[];
}

export interface ReferralSignupSummary {
  id: string;
  referredUserId: string;
  referredUserType: string;
  status: string;
  rewardPaid: boolean;
  createdAt: string;
}

export interface CompleteReferralResult {
  signupId: string;
  promoCodeId: string;
}

function generateCodeString(): string {
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

function mapCodeRow(row: any): ReferralCode {
  return {
    id: row.id,
    userId: row.user_id,
    userType: row.user_type,
    code: row.code,
    usesCount: row.uses_count,
    maxUses: row.max_uses,
    rewardCents: row.reward_cents,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapSignupRow(row: any): ReferralSignup {
  return {
    id: row.id,
    referralCodeId: row.referral_code_id,
    referredUserId: row.referred_user_id,
    referredUserType: row.referred_user_type,
    status: row.status,
    firstOrderId: row.first_order_id,
    rewardPaid: row.reward_paid,
    createdAt: row.created_at,
  };
}

async function generateCode(
  client: SupabaseClient,
  userId: string,
  userType: 'customer' | 'chef'
): Promise<ReferralCode> {
  const code = generateCodeString();

  const { data, error } = await client
    .from('referral_codes')
    .insert({
      user_id: userId,
      user_type: userType,
      code,
      reward_cents: REFERRAL_REWARD_CENTS,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapCodeRow(data);
}

async function validateAndGetCode(client: SupabaseClient, code: string): Promise<any> {
  const { data, error } = await client
    .from('referral_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data || !data.is_active) {
    throw new Error('Referral code not found or inactive');
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    throw new Error('Referral code has reached its maximum uses');
  }

  return data;
}

async function applyReferralCode(
  client: SupabaseClient,
  code: string,
  newUserId: string,
  userType: string
): Promise<ReferralSignup> {
  const codeRow = await validateAndGetCode(client, code);

  const { data, error } = await client
    .from('referral_signups')
    .insert({
      referral_code_id: codeRow.id,
      referred_user_id: newUserId,
      referred_user_type: userType,
      status: 'pending',
      reward_paid: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapSignupRow(data);
}

async function getSignupById(client: SupabaseClient, signupId: string): Promise<any> {
  const { data, error } = await client
    .from('referral_signups')
    .select('*')
    .eq('id', signupId)
    .single();

  if (error || !data) throw new Error('Referral signup not found');

  return data;
}

async function getReferralCodeById(client: SupabaseClient, codeId: string): Promise<any> {
  const { data, error } = await client
    .from('referral_codes')
    .select('*')
    .eq('id', codeId)
    .single();

  if (error || !data) throw new Error('Referral code not found');

  return data;
}

async function markSignupCompleted(
  client: SupabaseClient,
  signupId: string,
  orderId: string
): Promise<void> {
  await client
    .from('referral_signups')
    .update({ status: 'completed', first_order_id: orderId })
    .eq('id', signupId)
    .single();
}

async function createReferrerPromoCode(
  client: SupabaseClient,
  referrerId: string,
  rewardCents: number
): Promise<string> {
  const promoCode = `REFWD${generateCodeString().slice(0, 4)}`;

  const { data, error } = await client
    .from('promo_codes')
    .insert({
      code: promoCode,
      description: 'Referral reward - $5 credit',
      discount_type: 'fixed',
      discount_value: rewardCents / 100,
      usage_limit: 1,
      is_active: true,
      starts_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return data.id;
}

async function completeReferral(
  client: SupabaseClient,
  referralSignupId: string,
  orderId: string
): Promise<CompleteReferralResult> {
  const signup = await getSignupById(client, referralSignupId);
  const codeRow = await getReferralCodeById(client, signup.referral_code_id);

  await markSignupCompleted(client, referralSignupId, orderId);

  const promoCodeId = await createReferrerPromoCode(client, codeRow.user_id, codeRow.reward_cents);

  return { signupId: referralSignupId, promoCodeId };
}

async function getMyReferrals(
  client: SupabaseClient,
  userId: string
): Promise<ReferralStats | null> {
  const { data, error } = await client
    .from('referral_codes')
    .select('*, referral_signups(*)')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  const signups: any[] = data.referral_signups ?? [];
  const successfulReferrals = signups.filter((s: any) => s.status === 'completed' || s.status === 'rewarded').length;
  const earningsCents = signups.filter((s: any) => s.reward_paid).length * data.reward_cents;

  return {
    code: data.code,
    codeId: data.id,
    isActive: data.is_active,
    rewardCents: data.reward_cents,
    totalReferrals: signups.length,
    successfulReferrals,
    earningsCents,
    signups: signups.map((s: any) => ({
      id: s.id,
      referredUserId: s.referred_user_id,
      referredUserType: s.referred_user_type,
      status: s.status,
      rewardPaid: s.reward_paid,
      createdAt: s.created_at,
    })),
  };
}

export function createReferralService(client: SupabaseClient) {
  return {
    generateCode: (userId: string, userType: 'customer' | 'chef') => generateCode(client, userId, userType),
    applyReferralCode: (code: string, newUserId: string, userType: string) => applyReferralCode(client, code, newUserId, userType),
    completeReferral: (signupId: string, orderId: string) => completeReferral(client, signupId, orderId),
    getMyReferrals: (userId: string) => getMyReferrals(client, userId),
    _generateCodeString: generateCodeString,
  };
}

export class ReferralService {
  constructor(private client: SupabaseClient) {}

  generateCode(userId: string, userType: 'customer' | 'chef') {
    return generateCode(this.client, userId, userType);
  }

  applyReferralCode(code: string, newUserId: string, userType: string) {
    return applyReferralCode(this.client, code, newUserId, userType);
  }

  completeReferral(referralSignupId: string, orderId: string) {
    return completeReferral(this.client, referralSignupId, orderId);
  }

  getMyReferrals(userId: string) {
    return getMyReferrals(this.client, userId);
  }
}
