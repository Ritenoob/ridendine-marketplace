-- ==========================================
-- Migration 00028: Referral System
-- Tables: referral_codes, referral_signups
-- RLS: users see only their own referral data
-- ==========================================

-- ==========================================
-- 1. REFERRAL CODES
-- ==========================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'chef')),
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NULL,
  reward_cents INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE referral_codes IS
  'One referral code per user. code is 8-char uppercase alphanumeric.';

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id
  ON referral_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes(code);

CREATE INDEX IF NOT EXISTS idx_referral_codes_is_active
  ON referral_codes(is_active);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY referral_codes_select_own
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own referral code
CREATE POLICY referral_codes_insert_own
  ON referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update (increment uses_count etc.)
-- No authenticated UPDATE policy — use service_role client for mutations

-- ==========================================
-- 2. REFERRAL SIGNUPS
-- ==========================================

CREATE TABLE IF NOT EXISTS referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_type TEXT NOT NULL CHECK (referred_user_type IN ('customer', 'chef')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'rewarded')),
  first_order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referral_code_id, referred_user_id)
);

COMMENT ON TABLE referral_signups IS
  'Tracks new user signups via referral codes. Status transitions: pending -> completed -> rewarded.';

CREATE INDEX IF NOT EXISTS idx_referral_signups_referral_code_id
  ON referral_signups(referral_code_id);

CREATE INDEX IF NOT EXISTS idx_referral_signups_referred_user_id
  ON referral_signups(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_signups_status
  ON referral_signups(status);

ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;

-- Referred users can see their own signup record
CREATE POLICY referral_signups_select_referred
  ON referral_signups FOR SELECT
  USING (auth.uid() = referred_user_id);

-- Referrers can see signups for their codes (join via referral_codes)
CREATE POLICY referral_signups_select_referrer
  ON referral_signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referral_codes rc
      WHERE rc.id = referral_signups.referral_code_id
        AND rc.user_id = auth.uid()
    )
  );

-- Service role handles inserts/updates via admin client (bypasses RLS)
