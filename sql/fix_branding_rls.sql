-- =====================================================================
-- BRANDING TABLE RLS CLEANUP v2
-- Run this in Supabase SQL Editor → buendqgmwpxdixwvlkhd
--
-- Root cause: branding table has no user_id column. The correct
-- owner check must go through the tenants table, but a naive
-- EXISTS subquery fails because tenants RLS also applies inside it.
-- Fix: SECURITY DEFINER function bypasses tenants RLS cleanly.
-- =====================================================================

-- 1. Drop any partial state from previous attempts
DROP POLICY IF EXISTS "owner_full_access_by_user_id" ON public.branding;
DROP POLICY IF EXISTS "owner_full_access_by_tenant" ON public.branding;
DROP POLICY IF EXISTS "public_read_branding" ON public.branding;

-- These were dropped in the previous run but include for safety
DROP POLICY IF EXISTS "branding_owner_only" ON public.branding;
DROP POLICY IF EXISTS "branding_owner_write" ON public.branding;
DROP POLICY IF EXISTS "Owner Full Access" ON public.branding;
DROP POLICY IF EXISTS "Super admin update only" ON public.branding;
DROP POLICY IF EXISTS "Super admin insert only" ON public.branding;
DROP POLICY IF EXISTS "Users can update own branding" ON public.branding;
DROP POLICY IF EXISTS "Users can insert own branding" ON public.branding;
DROP POLICY IF EXISTS "Users can delete own branding" ON public.branding;
DROP POLICY IF EXISTS "Allow authenticated users to create branding" ON public.branding;
DROP POLICY IF EXISTS "Allow public read access to branding" ON public.branding;
DROP POLICY IF EXISTS "Anon read access" ON public.branding;
DROP POLICY IF EXISTS "branding_public_read" ON public.branding;
DROP POLICY IF EXISTS "Public read access" ON public.branding;
DROP POLICY IF EXISTS "branding_owner_access_v2" ON public.branding;

-- 2. Security-definer helper — bypasses RLS on tenants inside the subquery
CREATE OR REPLACE FUNCTION public.is_branding_owner(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = p_business_id
      AND tenants.owner_id = auth.uid()
  );
$$;

-- 3. Two clean policies

-- Customers (anyone) can read branding rows — needed to load the tenant app
CREATE POLICY "public_read_branding"
  ON public.branding FOR SELECT TO public
  USING (true);

-- Authenticated owners can INSERT / UPDATE / DELETE their own branding row
CREATE POLICY "owner_full_access_by_tenant"
  ON public.branding FOR ALL TO authenticated
  USING (public.is_branding_owner(business_id))
  WITH CHECK (public.is_branding_owner(business_id));
