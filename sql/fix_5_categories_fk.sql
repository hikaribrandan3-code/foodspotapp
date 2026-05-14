-- Fix Round 5: Fix 1 — Categories FK Constraint
-- Run this in Supabase SQL Editor
-- Problem: Production DB has a rogue FK referencing auth.users(id) instead of public.businesses(id)

ALTER TABLE public.categories
DROP CONSTRAINT IF EXISTS categories_business_id_fkey;

ALTER TABLE public.categories
ADD CONSTRAINT categories_business_id_fkey
FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
