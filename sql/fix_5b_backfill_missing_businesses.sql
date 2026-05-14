-- Fix Round 5: Fix 1b — Backfill missing businesses rows
-- Some branding rows exist without a matching businesses row.
-- This breaks the categories FK (and potentially other FKs).
-- Run this AFTER fix_5_categories_fk.sql

-- Step 1: See which business_ids are missing (diagnostic)
SELECT b.business_id, b.slug, b.business_name
FROM public.branding b
LEFT JOIN public.businesses bs ON bs.id = b.business_id
WHERE bs.id IS NULL AND b.business_id IS NOT NULL;

-- Step 2: Backfill missing businesses rows from branding data
-- Uses COALESCE to guarantee non-NULL slug (required by UNIQUE constraint)
INSERT INTO public.businesses (id, slug, name, created_at)
SELECT 
    b.business_id,
    COALESCE(NULLIF(b.slug, ''), 'biz-' || b.business_id::text) AS slug,
    COALESCE(NULLIF(b.business_name, ''), 'Unnamed Business') AS name,
    NOW() AS created_at
FROM public.branding b
LEFT JOIN public.businesses bs ON bs.id = b.business_id
WHERE bs.id IS NULL AND b.business_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
