-- ============================================================
-- FOODSPOT v2.2 POST-SIGNUP PATCH
-- Fixes: MP token column, expenses category constraint, language default
-- ============================================================

-- 1. ADD mp_access_token column to branding (required for MP token save)
ALTER TABLE public.branding
ADD COLUMN IF NOT EXISTS mp_access_token TEXT;

-- 2. DROP expenses category CHECK constraint (frontend has its own validation)
-- The frontend CATEGORIES array doesn't match the DB whitelist, causing inserts to fail.
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_category_check;

-- 3. Ensure categories table has sensible defaults for missing columns
ALTER TABLE public.categories
ALTER COLUMN sort_order SET DEFAULT 0,
ALTER COLUMN display_order SET DEFAULT 0,
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN is_enabled SET DEFAULT true;

-- 4. Hardcode Spanish for all existing businesses that don't have a language setting
INSERT INTO public.language_settings (business_id, language)
SELECT b.business_id, 'es'
FROM public.branding b
WHERE b.business_id NOT IN (SELECT business_id FROM public.language_settings)
ON CONFLICT (business_id) DO NOTHING;

-- 5. Update all existing language_settings to Spanish
UPDATE public.language_settings SET language = 'es' WHERE language = 'en';

-- 6. Update all tenants to Spanish
UPDATE public.tenants SET language = 'es' WHERE language = 'en' OR language IS NULL;

-- 7. Verify mp_access_token column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'branding' AND column_name = 'mp_access_token';
