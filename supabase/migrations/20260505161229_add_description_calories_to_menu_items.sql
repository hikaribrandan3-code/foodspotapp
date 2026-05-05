-- Add description and calories to menu_items for detailed menu cards
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS calories INT;
