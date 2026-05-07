-- Add sort_order column to categories table for drag-to-reorder functionality
ALTER TABLE categories ADD COLUMN sort_order INTEGER;

-- Auto-populate sort_order based on existing row order
UPDATE categories
SET sort_order = (
  SELECT ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at ASC) - 1
  FROM categories c2
  WHERE c2.id = categories.id
)
WHERE sort_order IS NULL;

-- Create index for query performance
CREATE INDEX idx_categories_business_id_sort_order
ON categories(business_id, sort_order);
