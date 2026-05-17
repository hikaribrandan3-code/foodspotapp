-- Add image_offset_y column to menu_items table
-- This allows owners to adjust the vertical crop of menu images (0-100, default 50 = center)
ALTER TABLE menu_items
ADD COLUMN image_offset_y INTEGER DEFAULT 50 CHECK (image_offset_y >= 0 AND image_offset_y <= 100);

-- Create index for efficient querying
CREATE INDEX idx_menu_items_image_offset_y ON menu_items(business_id, image_offset_y);
