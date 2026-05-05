-- Add AI description support to menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS description_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS calories INT;

-- Add comment for documentation
COMMENT ON COLUMN menu_items.description_source IS 'Origin of description: manual | ai';
COMMENT ON COLUMN menu_items.calories IS 'Estimated calorie count per serving';
