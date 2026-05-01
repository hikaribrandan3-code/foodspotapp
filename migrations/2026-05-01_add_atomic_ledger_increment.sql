-- ============================================
-- Fix 7: Atomic ledger total update for split payments
-- Prevents race conditions when multiple diners pay simultaneously
-- ============================================

CREATE OR REPLACE FUNCTION increment_ledger_total(
    p_ledger_id UUID,
    p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE table_ledgers
    SET total_paid = COALESCE(total_paid, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_ledger_id;
END;
$$;
