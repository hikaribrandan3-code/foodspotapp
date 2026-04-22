-- ============================================================
-- Staff Ops Migration — run in Supabase SQL Editor
-- ============================================================

-- 1. Add 'despachado' to the orders status enum
--    (splits en_camino into: assigned-to-rider vs actively-delivering)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'despachado'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'despachado' BEFORE 'en_camino';
  END IF;
END
$$;

-- If orders.status is a plain TEXT column (not an enum), run this instead:
-- No change needed — TEXT columns accept any value including 'despachado'.

-- 2. Add payment_confirmed column (used by cash verification gate)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE;

-- 3. Add assigned_to column (rider name assigned by logistics staff)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL;

-- 4. Update orderStateGuard logic reference:
--    The existing RLS and orderStateGuard.js check for 'en_camino'.
--    After this migration, also gate 'despachado' behind payment:
--
--    In orderStateGuard.js, change:
--      if ((newStatus === 'preparacion' || newStatus === 'en_camino') && !paymentConfirmed)
--    To:
--      if ((newStatus === 'preparacion' || newStatus === 'despachado' || newStatus === 'en_camino') && !paymentConfirmed)

-- 5. Verify the migration
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('status', 'payment_confirmed', 'assigned_to');
