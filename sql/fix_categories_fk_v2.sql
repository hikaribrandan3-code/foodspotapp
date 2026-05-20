-- FIX: Categories FK constraint must reference businesses(id), not auth.users
-- Run this in Supabase SQL Editor (new query)

-- 1. Drop the broken constraint if it exists (references auth.users or users)
ALTER TABLE public.categories
DROP CONSTRAINT IF EXISTS categories_business_id_fkey;

-- 2. Add correct FK referencing public.businesses(id) with CASCADE
ALTER TABLE public.categories
ADD CONSTRAINT categories_business_id_fkey
FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

-- 3. Verify it worked
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'categories'
    AND kcu.column_name = 'business_id';
