-- ============================================================================
-- 2026-06-16  LOYALTY ITEM POINT COSTS (Per-Item Redemption Pricing)
-- ============================================================================
-- WHY:
--   Current system: all free items cost the same (POINTS_TO_REDEEM).
--   New: each item can have its own point cost (like arcade games).
--   E.g., Coco Cola = 80 pts, Dasani = 100 pts, Heineken = 120 pts
--
-- HOW:
--   Add item_point_costs JSONB to loyalty_settings
--   Maps: { "item_name": points_cost }
--   Example: { "Coco cola 500ml": 80, "Dasani water": 100, "Heineken": 120 }
-- ============================================================================

ALTER TABLE public.loyalty_settings
ADD COLUMN item_point_costs JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.loyalty_settings.item_point_costs
IS 'Maps free item names to their point costs. E.g. {"Coco cola 500ml": 80, "Dasani water": 100}';
