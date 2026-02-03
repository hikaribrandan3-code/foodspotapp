-- Migration: Add missing columns to menu_items
-- Fixed PGRST204: Could not find the 'image' column of 'menu_items' in the schema cache

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;

-- Force schema cache reload (notify PostgREST)
NOTIFY pgrst, 'reload config';
