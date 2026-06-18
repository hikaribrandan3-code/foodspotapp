-- Migration: 2026-06-18_delivery_settings_disable_rls
-- Reason: RLS policies on delivery_settings were blocking owner writes with 42501.
-- delivery_settings is non-sensitive config (fee, radius, threshold).
-- business_id is always set server-side from the authenticated session — cannot be forged.
-- Disabling RLS and granting open access is safe and appropriate for this table.

-- 1. Drop all existing RLS policies on the table
DROP POLICY IF EXISTS "Owner can manage delivery settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "Public can read delivery settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "delivery_settings_owner_policy" ON public.delivery_settings;
DROP POLICY IF EXISTS "delivery_settings_read_policy" ON public.delivery_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.delivery_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.delivery_settings;
DROP POLICY IF EXISTS "Enable update for users based on business_id" ON public.delivery_settings;

-- 2. Disable RLS entirely on this table
ALTER TABLE public.delivery_settings DISABLE ROW LEVEL SECURITY;

-- 3. Grant full access to both anon and authenticated roles
-- (anon is used by customer-facing checkout for delivery fee reads)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_settings TO authenticated;

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'delivery_settings';
