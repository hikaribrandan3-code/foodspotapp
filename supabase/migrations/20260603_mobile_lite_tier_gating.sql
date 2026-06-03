-- ============================================================
-- FoodSpot Mobile Lite: Subscription Tier Gating
-- ============================================================
-- What this does:
--   1. Adds subscription_tier + mp_monthly_limit to branding
--   2. Seeds ALL existing tenants as 'pro' (no lockout risk)
--   3. Creates usage_tracking table (MP orders per month)
--   4. Creates check_tier_limits RPC (read limits)
--   5. Creates increment_mp_usage RPC (called from mp-webhook)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXTEND BRANDING TABLE
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.branding
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS mp_monthly_limit  INTEGER NOT NULL DEFAULT 30;

-- Constraint: only valid tiers allowed
ALTER TABLE public.branding
  DROP CONSTRAINT IF EXISTS branding_tier_check;

ALTER TABLE public.branding
  ADD CONSTRAINT branding_tier_check
  CHECK (subscription_tier IN ('free', 'pro'));

-- ────────────────────────────────────────────────────────────
-- 2. SEED ALL EXISTING TENANTS AS PRO
-- ────────────────────────────────────────────────────────────
-- CRITICAL: run BEFORE any user hits the gating logic.
-- Any tenant that already exists = owner/dev = pro.
-- New signups via create-tenant-on-signup will default to 'free'.

UPDATE public.branding
SET
  subscription_tier = 'pro',
  mp_monthly_limit  = 999999
WHERE subscription_tier = 'free';

-- ────────────────────────────────────────────────────────────
-- 3. USAGE TRACKING TABLE
-- ────────────────────────────────────────────────────────────
-- Tracks Mercado Pago orders per business per calendar month.
-- Row is auto-created on first payment, then incremented.

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES public.branding(business_id) ON DELETE CASCADE,
  month_year   TEXT        NOT NULL,    -- format: 'YYYY-MM'  e.g. '2026-06'
  mp_orders_used INTEGER   NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (business_id, month_year),
  CONSTRAINT mp_orders_non_negative CHECK (mp_orders_used >= 0)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_business_month
  ON public.usage_tracking (business_id, month_year);

-- RLS: only service_role can read/write usage (edge functions use service key)
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_tracking_service_only ON public.usage_tracking;
CREATE POLICY usage_tracking_service_only ON public.usage_tracking
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 4. RPC: check_tier_limits
-- ────────────────────────────────────────────────────────────
-- Called by:
--   - create-preference (before creating MP checkout)
--   - Frontend useTier() hook (to gate UI features)
--
-- Returns JSONB:
--   tier            TEXT     'free' | 'pro'
--   is_pro          BOOL
--   mp_limit        INT      max orders allowed this month
--   mp_used         INT      orders used this month
--   mp_remaining    INT      orders left (can be negative if glitch)
--   can_pay         BOOL     true if mp_remaining > 0

CREATE OR REPLACE FUNCTION public.check_tier_limits(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier     TEXT;
  v_limit    INTEGER;
  v_used     INTEGER;
BEGIN
  SELECT
    b.subscription_tier,
    b.mp_monthly_limit,
    COALESCE(u.mp_orders_used, 0)
  INTO v_tier, v_limit, v_used
  FROM public.branding b
  LEFT JOIN public.usage_tracking u
    ON  u.business_id = p_business_id
    AND u.month_year  = TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM')
  WHERE b.business_id = p_business_id;

  -- Business not found
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object(
      'error',        'business_not_found',
      'tier',         'free',
      'is_pro',       false,
      'mp_limit',     30,
      'mp_used',      0,
      'mp_remaining', 0,
      'can_pay',      false
    );
  END IF;

  RETURN jsonb_build_object(
    'tier',         v_tier,
    'is_pro',       v_tier = 'pro',
    'mp_limit',     v_limit,
    'mp_used',      v_used,
    'mp_remaining', GREATEST(0, v_limit - v_used),
    'can_pay',      (v_limit - v_used) > 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_tier_limits(UUID)
  TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: increment_mp_usage
-- ────────────────────────────────────────────────────────────
-- Called by: mp-webhook (after confirmed payment)
-- Creates the row if it doesn't exist, then increments.
-- Uses INSERT ... ON CONFLICT for atomic upsert (no race condition).

CREATE OR REPLACE FUNCTION public.increment_mp_usage(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month      TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_used_after INTEGER;
  v_limit      INTEGER;
BEGIN
  -- Atomic upsert: insert or increment
  INSERT INTO public.usage_tracking (business_id, month_year, mp_orders_used)
  VALUES (p_business_id, v_month, 1)
  ON CONFLICT (business_id, month_year)
  DO UPDATE SET
    mp_orders_used = usage_tracking.mp_orders_used + 1,
    updated_at     = NOW()
  RETURNING mp_orders_used INTO v_used_after;

  -- Fetch limit for response
  SELECT mp_monthly_limit INTO v_limit
  FROM public.branding
  WHERE business_id = p_business_id;

  RETURN jsonb_build_object(
    'month',        v_month,
    'mp_used',      v_used_after,
    'mp_limit',     v_limit,
    'mp_remaining', GREATEST(0, v_limit - v_used_after)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_mp_usage(UUID)
  TO service_role;

-- ────────────────────────────────────────────────────────────
-- 6. RPC: upgrade_to_pro  (admin / future payment webhook)
-- ────────────────────────────────────────────────────────────
-- Call this when a tenant pays for Pro.
-- For now: manual call from Supabase dashboard or admin panel.

CREATE OR REPLACE FUNCTION public.upgrade_to_pro(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.branding
  SET
    subscription_tier = 'pro',
    mp_monthly_limit  = 999999
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'business_not_found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tier',    'pro',
    'message', 'Upgraded to Pro'
  );
END;
$$;

-- Only service_role can upgrade tenants
GRANT EXECUTE ON FUNCTION public.upgrade_to_pro(UUID)
  TO service_role;

-- ────────────────────────────────────────────────────────────
-- 7. VERIFY (sanity check — runs at migration time)
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_tier_col     BOOLEAN;
  v_limit_col    BOOLEAN;
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branding' AND column_name = 'subscription_tier'
  ) INTO v_tier_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branding' AND column_name = 'mp_monthly_limit'
  ) INTO v_limit_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'usage_tracking'
  ) INTO v_table_exists;

  IF NOT v_tier_col THEN
    RAISE EXCEPTION 'MIGRATION FAILED: subscription_tier column not found on branding';
  END IF;

  IF NOT v_limit_col THEN
    RAISE EXCEPTION 'MIGRATION FAILED: mp_monthly_limit column not found on branding';
  END IF;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'MIGRATION FAILED: usage_tracking table not created';
  END IF;

  RAISE NOTICE '✅ Mobile Lite tier migration verified successfully';
END;
$$;
