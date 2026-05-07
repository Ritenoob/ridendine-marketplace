// ==========================================
// REFERRAL SERVICE TESTS
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReferralService,
  createReferralService,
  REFERRAL_REWARD_CENTS,
} from './referral.service';

// Minimal mock Supabase client
function makeClient(overrides: Record<string, any> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  } as any;
}

describe('ReferralService', () => {
  describe('generateCode', () => {
    it('creates an 8-character alphanumeric uppercase code', async () => {
      const codeRow = {
        id: 'rc-1',
        user_id: 'u-1',
        user_type: 'customer',
        code: 'ABC12345',
        uses_count: 0,
        max_uses: null,
        reward_cents: 500,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: codeRow, error: null }),
      });

      const svc = createReferralService(client);
      const result = await svc.generateCode('u-1', 'customer');

      expect(result.code).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.userId).toBe('u-1');
      expect(result.userType).toBe('customer');
      expect(result.rewardCents).toBe(REFERRAL_REWARD_CENTS);
    });

    it('throws when database insert fails', async () => {
      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
      });

      const svc = createReferralService(client);
      await expect(svc.generateCode('u-1', 'customer')).rejects.toThrow('db error');
    });
  });

  describe('applyReferralCode', () => {
    it('links a new signup to a referral code', async () => {
      const codeRow = {
        id: 'rc-1',
        user_id: 'u-1',
        user_type: 'customer',
        code: 'ABC12345',
        uses_count: 0,
        max_uses: null,
        reward_cents: 500,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const signupRow = {
        id: 'rs-1',
        referral_code_id: 'rc-1',
        referred_user_id: 'u-2',
        referred_user_type: 'customer',
        status: 'pending',
        first_order_id: null,
        reward_paid: false,
        created_at: new Date().toISOString(),
      };

      // First call: look up code; second call: insert signup
      const singleMock = vi.fn()
        .mockResolvedValueOnce({ data: codeRow, error: null })
        .mockResolvedValueOnce({ data: signupRow, error: null });

      const client = makeClient({ single: singleMock });
      const svc = createReferralService(client);

      const result = await svc.applyReferralCode('ABC12345', 'u-2', 'customer');

      expect(result.referralCodeId).toBe('rc-1');
      expect(result.referredUserId).toBe('u-2');
      expect(result.status).toBe('pending');
    });

    it('throws when code is not found', async () => {
      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
      });

      const svc = createReferralService(client);
      await expect(svc.applyReferralCode('BADCODE1', 'u-2', 'customer')).rejects.toThrow(
        'Referral code not found or inactive'
      );
    });

    it('throws when code is inactive', async () => {
      const inactiveCode = {
        id: 'rc-1',
        code: 'INACTIV1',
        is_active: false,
        uses_count: 0,
        max_uses: null,
        reward_cents: 500,
      };

      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: inactiveCode, error: null }),
      });

      const svc = createReferralService(client);
      await expect(svc.applyReferralCode('INACTIV1', 'u-2', 'customer')).rejects.toThrow(
        'Referral code not found or inactive'
      );
    });

    it('throws when max_uses is reached', async () => {
      const fullCode = {
        id: 'rc-1',
        code: 'FULL1234',
        is_active: true,
        uses_count: 5,
        max_uses: 5,
        reward_cents: 500,
      };

      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: fullCode, error: null }),
      });

      const svc = createReferralService(client);
      await expect(svc.applyReferralCode('FULL1234', 'u-2', 'customer')).rejects.toThrow(
        'Referral code has reached its maximum uses'
      );
    });
  });

  describe('completeReferral', () => {
    it('marks referral completed and creates promo code for referrer', async () => {
      const signupRow = {
        id: 'rs-1',
        referral_code_id: 'rc-1',
        referred_user_id: 'u-2',
        referred_user_type: 'customer',
        status: 'pending',
        first_order_id: null,
        reward_paid: false,
      };

      const codeRow = {
        id: 'rc-1',
        user_id: 'u-1',
        reward_cents: 500,
      };

      const promoRow = { id: 'promo-1', code: 'REFWD1234' };

      const singleMock = vi.fn()
        .mockResolvedValueOnce({ data: signupRow, error: null }) // get signup
        .mockResolvedValueOnce({ data: codeRow, error: null })   // get referral code
        .mockResolvedValueOnce({ data: { id: 'rs-1' }, error: null }) // update signup
        .mockResolvedValueOnce({ data: promoRow, error: null });  // insert promo

      const client = makeClient({ single: singleMock });
      const svc = createReferralService(client);

      const result = await svc.completeReferral('rs-1', 'order-1');

      expect(result.promoCodeId).toBe('promo-1');
    });

    it('throws when referral signup not found', async () => {
      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
      });

      const svc = createReferralService(client);
      await expect(svc.completeReferral('bad-id', 'order-1')).rejects.toThrow('Referral signup not found');
    });
  });

  describe('getMyReferrals', () => {
    it('returns referral code and list of signups', async () => {
      const codeRow = {
        id: 'rc-1',
        user_id: 'u-1',
        user_type: 'customer',
        code: 'MYCODE12',
        uses_count: 3,
        max_uses: null,
        reward_cents: 500,
        is_active: true,
        created_at: new Date().toISOString(),
        referral_signups: [
          { id: 'rs-1', referred_user_id: 'u-2', referred_user_type: 'customer', status: 'completed', reward_paid: true, created_at: new Date().toISOString() },
          { id: 'rs-2', referred_user_id: 'u-3', referred_user_type: 'customer', status: 'pending', reward_paid: false, created_at: new Date().toISOString() },
        ],
      };

      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: codeRow, error: null }),
      });

      const svc = createReferralService(client);
      const result = await svc.getMyReferrals('u-1');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('MYCODE12');
      expect(result!.totalReferrals).toBe(2);
      expect(result!.successfulReferrals).toBe(1);
      expect(result!.earningsCents).toBe(500); // 1 rewarded
    });

    it('returns null when user has no referral code', async () => {
      const client = makeClient({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
      });

      const svc = createReferralService(client);
      const result = await svc.getMyReferrals('u-new');

      expect(result).toBeNull();
    });
  });

  describe('generateCodeString', () => {
    it('produces URL-safe uppercase alphanumeric codes', () => {
      const svc = createReferralService(makeClient());
      // Access internal via type cast for coverage
      const code = (svc as any)._generateCodeString();
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });
  });
});
