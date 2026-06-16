-- ============================================================================
-- 2026-06-16  LOYALTY EARN TRIGGER — DIAGNOSTIC ONLY (read-only, changes nothing)
-- ----------------------------------------------------------------------------
-- The earn mechanism lives ONLY in the live DB (no repo SQL defines it). Before
-- "fixing" a units mismatch, we must SEE the real comparison — because
-- orders.total is now confirmed to be INTEGER CENTS, so a NEW.total >=
-- min_order_cents check would already be correct (cents vs cents).
--
-- Run all 4 queries and paste the output back.
-- ============================================================================

-- 1) Which triggers exist on the orders table?
SELECT tgname            AS trigger_name,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'orders'
  AND NOT t.tgisinternal;

-- 2) Full source of any loyalty-related trigger function.
SELECT p.proname AS function_name,
       pg_get_functiondef(p.oid) AS source
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%loyalty%' OR p.proname ILIKE '%point%');

-- 3) What does loyalty_settings actually hold? (units sanity check)
SELECT business_id, enabled, points_per_order, min_order_cents,
       ugc_points_per_share, referral_points
FROM public.loyalty_settings
LIMIT 5;

-- 4) Are points actually being earned? (recent earn transactions)
SELECT business_id, type, points_delta, order_id, created_at
FROM public.loyalty_transactions
WHERE type = 'earn'
ORDER BY created_at DESC
LIMIT 10;
