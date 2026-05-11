-- Migration: Normalize service_modes from app_config JSONB to flat columns
-- Run this in Supabase SQL Editor before deploying the frontend update

-- 1. Add flat columns to the branding table
ALTER TABLE branding
  ADD COLUMN IF NOT EXISTS pickup_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dine_in_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dine_in_payment_timing text DEFAULT 'after';

-- 2. Backfill existing rows from app_config JSONB
UPDATE branding
SET
  pickup_enabled = COALESCE(
    (app_config->'service_modes'->>'pickup')::boolean,
    true
  ),
  delivery_enabled = COALESCE(
    (app_config->'service_modes'->>'delivery')::boolean,
    true
  ),
  dine_in_enabled = COALESCE(
    (app_config->'service_modes'->>'dineIn')::boolean,
    false
  ),
  dine_in_payment_timing = COALESCE(
    app_config->'service_modes'->>'dineInPayment',
    'after'
  )
WHERE app_config IS NOT NULL
  AND app_config ? 'service_modes';

-- 3. Verify backfill (spot-check a few rows)
-- SELECT business_id, pickup_enabled, delivery_enabled, dine_in_enabled, dine_in_payment_timing
-- FROM branding
-- LIMIT 10;
