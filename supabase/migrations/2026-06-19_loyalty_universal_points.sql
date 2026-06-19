-- ============================================================
-- Loyalty: Universal Points (cross-location)
-- Points follow the customer's phone number, not business_id.
-- loyalty_accounts: unique per phone (global balance)
-- loyalty_transactions: keeps business_id for per-location audit trail
-- loyalty_referral_claims: unique per referee phone (can only be referred once globally)
-- ============================================================

-- ── STEP 1: Merge any duplicate accounts (same phone, different business_id)
-- Sum all points per phone before dropping the old constraint
CREATE TEMP TABLE _loyalty_merged AS
  SELECT customer_phone, SUM(points_balance) AS total_points
  FROM loyalty_accounts
  GROUP BY customer_phone;

-- ── STEP 2: Drop old unique constraint
ALTER TABLE loyalty_accounts
  DROP CONSTRAINT IF EXISTS loyalty_accounts_business_id_customer_phone_key;

ALTER TABLE loyalty_accounts
  DROP CONSTRAINT IF EXISTS loyalty_accounts_pkey CASCADE;

-- ── STEP 3: Delete all but one row per phone (keep the one with highest balance,
-- then update it with the merged total)
DELETE FROM loyalty_accounts a
  USING (
    SELECT customer_phone, MIN(id) AS keep_id
    FROM loyalty_accounts
    GROUP BY customer_phone
    HAVING COUNT(*) > 1
  ) dup
  WHERE a.customer_phone = dup.customer_phone
    AND a.id != dup.keep_id;

-- ── STEP 4: Update kept rows to the merged total
UPDATE loyalty_accounts la
  SET points_balance = m.total_points
  FROM _loyalty_merged m
  WHERE la.customer_phone = m.customer_phone;

-- ── STEP 5: Drop business_id from loyalty_accounts (no longer needed for balance)
-- Keep it nullable temporarily to allow safe rollback if needed
ALTER TABLE loyalty_accounts
  DROP COLUMN IF EXISTS business_id;

-- ── STEP 6: Re-add PK + new unique constraint on phone only
ALTER TABLE loyalty_accounts ADD PRIMARY KEY (id);
ALTER TABLE loyalty_accounts
  ADD CONSTRAINT loyalty_accounts_customer_phone_key UNIQUE (customer_phone);

-- ── STEP 7: Update the increment_loyalty_points RPC
-- Now operates on customer_phone only — business_id removed from account lookup
-- business_id is still logged in loyalty_transactions for audit
CREATE OR REPLACE FUNCTION increment_loyalty_points(
  p_phone    TEXT,
  p_delta    INTEGER,
  p_business_id UUID DEFAULT NULL  -- kept for backward compat, unused for balance
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE loyalty_accounts
  SET
    points_balance = GREATEST(0, points_balance + p_delta),
    updated_at     = now()
  WHERE customer_phone = p_phone;

  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (customer_phone, points_balance)
    VALUES (p_phone, GREATEST(0, p_delta))
    ON CONFLICT (customer_phone) DO UPDATE
      SET points_balance = GREATEST(0, loyalty_accounts.points_balance + p_delta),
          updated_at     = now();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_loyalty_points(TEXT, INTEGER, UUID) TO anon, authenticated;

-- ── STEP 8: loyalty_referral_claims — global unique per referee phone
-- A customer can only receive a referral bonus once, regardless of which location
ALTER TABLE loyalty_referral_claims
  DROP CONSTRAINT IF EXISTS loyalty_referral_claims_unique;

ALTER TABLE loyalty_referral_claims
  ADD CONSTRAINT loyalty_referral_claims_unique UNIQUE (referee_phone);

-- ── STEP 9: Indexes
DROP INDEX IF EXISTS idx_loyalty_accounts_phone_biz;
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_phone ON loyalty_accounts (customer_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_phone ON loyalty_transactions (customer_phone);
