-- Migration: Add ordering columns to menu_items for drag-and-drop persistence
-- Fixes: Menu item reordering in modo dueño doesn't persist after reload

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_menu_items_business_display_order
ON public.menu_items(business_id, display_order);
