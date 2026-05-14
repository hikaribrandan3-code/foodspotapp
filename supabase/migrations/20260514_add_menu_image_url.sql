-- Migration: Add image_url column to menu_items and backfill from legacy image column
-- Fixes: Menu item images show placeholder because owner UI writes to image_url
--        but the database only had an `image` column.

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Backfill: copy any existing image data into the new canonical column
UPDATE public.menu_items
SET image_url = image
WHERE image_url IS NULL
  AND image IS NOT NULL
  AND image != '';
