-- ============================================
-- 🎯 ADD updated_at TO orders TABLE
-- ============================================
-- The advance_order_status RPC references this column,
-- but it was never added to the schema. This migration
-- fixes the "column updated_at of relation orders does not exist"
-- error thrown when staff uses the RPC.
-- ============================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill existing rows so they don't stay NULL
UPDATE public.orders
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
