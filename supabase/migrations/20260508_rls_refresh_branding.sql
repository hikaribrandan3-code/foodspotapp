-- RLS Policy Refresh for branding table
-- Run this in Supabase SQL Editor

-- Step 1: Inspect existing policies (optional, run first to confirm names)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'branding';

-- Step 2: Refresh SELECT policy (public read access)
-- Replace policy name if yours is different
DROP POLICY IF EXISTS "Allow public read access" ON branding;
CREATE POLICY "Allow public read access" ON branding
FOR SELECT USING (true);

-- Step 3: Refresh UPDATE policy (owner-only writes)
-- Replace policy name and condition if yours is different
DROP POLICY IF EXISTS "Allow authorized updates" ON branding;
CREATE POLICY "Allow authorized updates" ON branding
FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- Step 4: If your setup uses a custom owner-check function, uncomment below
-- DROP POLICY IF EXISTS "branding_owner_update" ON branding;
-- CREATE POLICY "branding_owner_update" ON branding
-- FOR UPDATE USING (
--   is_branding_owner(business_id)
-- ) WITH CHECK (
--   is_branding_owner(business_id)
-- );

-- Step 5: Verify the new columns are visible
SELECT
  business_id,
  pickup_enabled,
  delivery_enabled,
  dine_in_enabled,
  dine_in_payment_timing
FROM branding
LIMIT 5;
