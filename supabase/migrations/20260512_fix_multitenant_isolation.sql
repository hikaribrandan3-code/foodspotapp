-- ========================================================
-- CRITICAL FIX: Multi-Tenant Isolation for Guest Access
-- Date: 2026-05-12
-- Issue:
--   1. event_orders RLS policy only checked guest_token (no business_id)
--   2. old guest_checkout_rls.sql had "Public order status view" with USING(true)
--      allowing ANYONE to read ANY order from orders table
--   3. This created cross-tenant data leakage vulnerability
-- ========================================================

-- STEP 1: Fix event_orders table
-- Drop the vulnerable guest read policy (checked only guest_token, not business_id)
DROP POLICY IF EXISTS "event_orders_guest_read" ON public.event_orders;

-- Replace with business_id-scoped policy
-- Guest can ONLY see orders where BOTH conditions are true:
--   1. guest_token matches their token (from localStorage + header)
--   2. business_id matches the tenant they're accessing (from TenantContext)
CREATE POLICY "event_orders_guest_read"
ON public.event_orders FOR SELECT
USING (
    guest_token = current_setting('request.headers', true)::json->>'x-guest-token'
    AND
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);

-- STEP 2: Fix orders table (old order system)
-- Drop the overly permissive "Public order status view" policy that allowed ANYONE to read ANY order
DROP POLICY IF EXISTS "Public order status view" ON public.orders;

-- Replace with proper guest-only read policy that requires BOTH guest_token AND business_id
CREATE POLICY "Public order status view" ON public.orders
FOR SELECT
USING (
    guest_token = (current_setting('request.headers', true)::json->>'x-guest-token')::uuid
    AND
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);

-- ========================================================
-- VERIFY: Check that policies are correct
-- ========================================================
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('orders', 'event_orders')
-- ORDER BY tablename, policyname;
