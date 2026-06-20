-- ============================================================
-- HOTFIX: Remove business_id from loyalty_accounts writes
-- Two functions were still referencing the dropped column:
-- 1. increment_loyalty_points (old body still in DB)
-- 2. award_loyalty_points_on_order_confirmed (trigger function)
-- ============================================================

-- ── FIX 1: increment_loyalty_points ─────────────────────────
CREATE OR REPLACE FUNCTION public.increment_loyalty_points(
  p_phone       TEXT,
  p_delta       INTEGER,
  p_business_id UUID DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION public.increment_loyalty_points(TEXT, INTEGER, UUID) TO anon, authenticated;

-- ── FIX 2: award_loyalty_points_on_order_confirmed ──────────
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_order_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings loyalty_settings%ROWTYPE;
  v_already_awarded INT;
BEGIN
  -- Only fire when transitioning INTO released_to_kitchen
  IF NEW.status != 'released_to_kitchen' OR OLD.status = 'released_to_kitchen' THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_phone IS NULL OR NEW.customer_phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings
  FROM loyalty_settings
  WHERE business_id = NEW.business_id;

  IF v_settings IS NULL OR NOT v_settings.enabled THEN
    RETURN NEW;
  END IF;

  IF NEW.total::bigint < v_settings.min_order_cents THEN
    RETURN NEW;
  END IF;

  -- Idempotency guard: never double-award same order
  SELECT COUNT(*) INTO v_already_awarded
  FROM loyalty_transactions
  WHERE order_id = NEW.id AND type = 'earn';

  IF v_already_awarded > 0 THEN
    RETURN NEW;
  END IF;

  -- Upsert account (phone-scoped, no business_id)
  INSERT INTO loyalty_accounts (customer_phone, points_balance)
  VALUES (NEW.customer_phone, 0)
  ON CONFLICT (customer_phone) DO NOTHING;

  -- Award points
  UPDATE loyalty_accounts
  SET points_balance = points_balance + v_settings.points_per_order,
      updated_at = NOW()
  WHERE customer_phone = NEW.customer_phone;

  -- Log it (business_id kept here for per-location audit trail)
  INSERT INTO loyalty_transactions (business_id, customer_phone, order_id, type, points_delta)
  VALUES (NEW.business_id, NEW.customer_phone, NEW.id, 'earn', v_settings.points_per_order);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload config';
