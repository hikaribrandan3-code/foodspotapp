-- ============================================================================
-- 2026-06-16  CASH SETTLEMENT RPC  (Database Bible v2.4)
-- ----------------------------------------------------------------------------
-- WHY:
--   staff-ops runs on the ANON key (no user session, only an x-business-id
--   header). transaction_ledger has RLS enabled but NO anon INSERT policy, so
--   every cash ledger write from staff/customer clients silently 403s. Result:
--   staff "Verify Cash" advanced the order status but never wrote a ledger row,
--   and the owner Analytics dashboard (which reads revenue exclusively from
--   transaction_ledger) under-reported cash revenue.
--
-- FIX:
--   One SECURITY DEFINER settlement path that bypasses RLS safely, validates
--   tenant ownership server-side, computes money from the DB row (clients can
--   never forge an amount), and is idempotent. All three client paths
--   (staff verifyCash, owner Dashboard confirm, customer offline-drain) call
--   this single function so there is exactly one cash row per order, ever.
--
-- NOTE ON COLUMN NAME:
--   The LIVE orders table stores the order total in column `total` (integer
--   cents). `createOrderCloud()` writes `total`; nothing in the app reads
--   orders.total_cents. (The bible's "orders.total_cents canonical" line is
--   drift — corrected in v2.4.) This function reads `total`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_cash_payment(
  p_order_id       UUID,
  p_business_id    UUID,
  p_payment_method TEXT DEFAULT 'cash',
  p_currency       TEXT DEFAULT 'ARS'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  RECORD;
  v_gross  INTEGER;
  v_key    TEXT;
BEGIN
  -- Deterministic per-order key. Cash dedupes to one row regardless of which
  -- client (staff KDS, owner Dashboard, offline drain) settles it first.
  v_key := 'cash-' || p_order_id::text;

  -- 1) Tenant isolation enforced server-side: the order must belong to the
  --    business the caller claims. SECURITY DEFINER bypasses RLS, so this
  --    explicit check is the isolation boundary.
  SELECT id, business_id, total, status
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND business_id = p_business_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- 2) Idempotency without relying on a named unique constraint.
  IF EXISTS (
    SELECT 1 FROM public.transaction_ledger WHERE idempotency_key = v_key
  ) THEN
    RETURN jsonb_build_object('success', true, 'already_recorded', true);
  END IF;

  -- 3) Money math is read from the DB, never from the client. Integer cents.
  --    Cash carries no platform fee (matches existing behavior).
  v_gross := COALESCE(v_order.total, 0);

  INSERT INTO public.transaction_ledger (
    order_id, business_id, transaction_type, status,
    amount_gross_cents, platform_fee_cents, net_to_owner_cents,
    idempotency_key, currency, payment_method, external_reference, processed_at
  ) VALUES (
    p_order_id, p_business_id, 'payment', 'completed',
    v_gross, 0, v_gross,
    v_key, p_currency, p_payment_method,
    upper(p_payment_method) || '-' || p_order_id::text, now()
  );

  RETURN jsonb_build_object('success', true, 'amount_gross_cents', v_gross);
END;
$$;

-- Both anon (staff-ops / customer) and authenticated (owner web) call this.
GRANT EXECUTE ON FUNCTION public.record_cash_payment(UUID, UUID, TEXT, TEXT)
  TO anon, authenticated;
