-- RLS Policy Refresh for branding table
-- Run this in Supabase SQL Editor to ensure new flat columns are readable/writable

-- 1. Inspect existing policies (run this first to confirm your actual policy names)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'branding';

-- 2. Refresh SELECT policy (public read access)
--    Replace policy name if yours is different
DROP POLICY IF EXISTS "Allow public read access" ON branding;
CREATE POLICY "Allow public read access" ON branding
FOR SELECT USING (true);

-- 3. Refresh UPDATE policy (owner-only writes)
--    Replace policy name and condition if yours is different.
--    Common patterns:
--      a) auth.uid() = user_id
--      b) auth.uid() IN (SELECT owner_id FROM businesses WHERE id = business_id)
--      c) is_branding_owner(business_id)
DROP POLICY IF EXISTS "Allow authorized updates" ON branding;
CREATE POLICY "Allow authorized updates" ON branding
FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- 4. If your setup uses a custom owner-check function, uncomment and adapt:
-- DROP POLICY IF EXISTS "branding_owner_update" ON branding;
-- CREATE POLICY "branding_owner_update" ON branding
-- FOR UPDATE USING (
--   is_branding_owner(business_id)
-- ) WITH CHECK (
--   is_branding_owner(business_id)
-- );

-- 5. Verify the new columns are visible after policy refresh
SELECT
  business_id,
  pickup_enabled,
  delivery_enabled,
  dine_in_enabled,
  dine_in_payment_timing
FROM branding
LIMIT 5;
