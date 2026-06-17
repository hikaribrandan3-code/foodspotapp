-- Loyalty System v2: UGC + Referral Points
-- Run this migration to enable camera share points and referral rewards

-- 1. Add UGC points configuration to loyalty_settings
ALTER TABLE loyalty_settings
  ADD COLUMN IF NOT EXISTS ugc_points_per_share INTEGER DEFAULT 10;

-- 2. Add referral points configuration to loyalty_settings
ALTER TABLE loyalty_settings
  ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 100;

-- 3. Update loyalty_transactions type constraint to allow ugc_receipt and referral
ALTER TABLE loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;

ALTER TABLE loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_type_check
  CHECK (type IN ('earn', 'redeem', 'ugc_receipt', 'referral'));

-- 4. Create loyalty_referral_claims table (tracks referral awards to prevent double-claiming)
CREATE TABLE IF NOT EXISTS loyalty_referral_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referrer_phone TEXT NOT NULL,
  referee_phone TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT loyalty_referral_claims_unique UNIQUE(business_id, referee_phone)
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_loyalty_referral_claims_business ON loyalty_referral_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_referral_claims_referee ON loyalty_referral_claims(business_id, referee_phone);

-- Enable RLS
ALTER TABLE loyalty_referral_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see claims for their business
DROP POLICY IF EXISTS "loyalty_referral_claims_isolation" ON loyalty_referral_claims;
CREATE POLICY "loyalty_referral_claims_isolation" ON loyalty_referral_claims
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON loyalty_referral_claims TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
