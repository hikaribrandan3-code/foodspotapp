-- ============================================================
-- Setup parent_slug for multi-location hub (pro SaaS pattern)
-- Date: 2026-06-22
-- ============================================================

-- Pattern:
--   Brand hub at: /foodspot-main (shows all locations)
--   Location menus at: /foodspot, /foodspot-buenos-aires, etc.
--   If only 1 location, /foodspot-main just redirects to /foodspot

-- Set parent_slug to 'foodspot-main' for all FoodSpot Mobile locations
-- (identified by owner_id from the primary foodspot business)
UPDATE businesses
SET parent_slug = 'foodspot-main'
WHERE owner_id = (
  SELECT owner_id FROM businesses
  WHERE slug = 'foodspot' AND deleted_at IS NULL
  LIMIT 1
)
AND deleted_at IS NULL;

-- Verify: List all locations with their parent_slug
-- SELECT slug, name, parent_slug FROM businesses
-- WHERE owner_id = (SELECT owner_id FROM businesses WHERE slug = 'foodspot' LIMIT 1)
-- ORDER BY created_at;
