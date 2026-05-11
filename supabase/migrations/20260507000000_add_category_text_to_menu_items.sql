-- Add TEXT category field to menu_items for denormalization
-- Allows MenuManager to store category as string name instead of FK
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category-based filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(business_id, category);
