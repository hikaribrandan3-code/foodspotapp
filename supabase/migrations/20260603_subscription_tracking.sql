-- ============================================================
-- Subscription tracking columns on branding
-- Adds MP subscription_id + subscription_status for Pro management
-- NOTE: mp_monthly_limit stays NOT NULL (Pro = 999999, Free = 30)
-- ============================================================

ALTER TABLE public.branding
  ADD COLUMN IF NOT EXISTS subscription_id     TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

ALTER TABLE public.branding
  DROP CONSTRAINT IF EXISTS branding_subscription_status_check;

ALTER TABLE public.branding
  ADD CONSTRAINT branding_subscription_status_check
  CHECK (
    subscription_status IN ('pending', 'active', 'cancelled', 'paused')
    OR subscription_status IS NULL
  );
