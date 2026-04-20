-- =====================================================================
-- BRANDING TABLE RLS CLEANUP
-- Run this in Supabase SQL Editor → buendqgmwpxdixwvlkhd
--
-- Problem: 13+ conflicting policies cause UPDATE to silently return 0
-- rows. The user_id fallback in supabaseClient.js handles the code
-- side, but cleaning policies prevents future confusion.
-- =====================================================================

-- 1. DROP all conflicting write/read policies
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

-- 2. Recreate clean minimal policies

-- Customers (and anyone) can read any branding row — needed to load the tenant app
CREATE POLICY "public_read_branding"
  ON public.branding FOR SELECT TO public
  USING (true);

-- Owners can do everything on their own row matched by user_id (set at signup)
CREATE POLICY "owner_full_access_by_user_id"
  ON public.branding FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fallback: owners via tenants table join (covers rows where business_id is set)
CREATE POLICY "owner_full_access_by_tenant"
  ON public.branding FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = branding.business_id
        AND tenants.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = branding.business_id
        AND tenants.owner_id = auth.uid()
    )
  );
