-- 1. Add service_modes to branding
-- Controls active service flows: dineIn, delivery, pickup, events
ALTER TABLE branding 
ADD COLUMN IF NOT EXISTS service_modes JSONB DEFAULT '{"dineIn": true, "dineInPayment": "before", "delivery": true, "events": true}'::jsonb;

-- 2. Add metadata to menu_items
-- Stores product variants, spice levels, bundle contents, etc.
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Add documentation comments
COMMENT ON COLUMN branding.service_modes IS 'Controls active service flows: dineIn, delivery, pickup, events';
COMMENT ON COLUMN menu_items.metadata IS 'Stores product variants, spice levels, bundle contents, etc.';
