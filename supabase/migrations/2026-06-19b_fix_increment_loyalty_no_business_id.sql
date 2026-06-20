-- ============================================================
-- HOTFIX: increment_loyalty_points — remove business_id from loyalty_accounts
-- The 2026-06-19 migration dropped the business_id column from loyalty_accounts
-- but the function body still referenced it. This replaces the function with
-- the correct version that only uses customer_phone.
-- ============================================================

CREATE OR REPLACE FUNCTION increment_loyalty_points(
  p_phone       TEXT,
  p_delta       INTEGER,
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

NOTIFY pgrst, 'reload config';
