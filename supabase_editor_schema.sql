-- ========================================================
-- FOODSPOT EDITOR SCHEMA UPDATE
-- Add these columns to the `branding` table via Supabase SQL Editor
-- ========================================================

ALTER TABLE branding 
ADD COLUMN IF NOT EXISTS design_state JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_printed_at TIMESTAMPTZ;

-- Description:
-- `design_state` stores the active theme, font pairing, colors, and QR settings for the FoodSpot Editor.
-- `last_printed_at` stores the timestamp of the last generated A4 menu, used for sync warnings.
