-- RPC: get_ai_inventory_context
-- Returns inventory levels, low-stock alerts, and COGS summary for the AI advisor.
-- Called by the foodspot-ai edge function alongside get_ai_business_context.

CREATE OR REPLACE FUNCTION get_ai_inventory_context(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total_items INT;
  v_low_stock_items JSONB;
  v_out_of_stock_items JSONB;
  v_total_cogs_value NUMERIC;
  v_categories_with_stock JSONB;
BEGIN
  -- Total tracked items
  SELECT COUNT(*)
  INTO v_total_items
  FROM inventory i
  JOIN menu_items mi ON mi.id = i.menu_item_id
  WHERE i.business_id = p_business_id
    AND mi.is_active = true;

  IF v_total_items = 0 THEN
    RETURN jsonb_build_object('has_data', false);
  END IF;

  -- Low stock: quantity_available <= reorder_level (but > 0)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', mi.name,
      'qty', i.quantity_available,
      'reorder_at', i.reorder_level,
      'unit', i.unit
    ) ORDER BY i.quantity_available ASC
  ), '[]'::jsonb)
  INTO v_low_stock_items
  FROM inventory i
  JOIN menu_items mi ON mi.id = i.menu_item_id
  WHERE i.business_id = p_business_id
    AND mi.is_active = true
    AND i.quantity_available > 0
    AND i.reorder_level IS NOT NULL
    AND i.quantity_available <= i.reorder_level;

  -- Out of stock: quantity_available = 0
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', mi.name,
      'unit', i.unit
    ) ORDER BY mi.name
  ), '[]'::jsonb)
  INTO v_out_of_stock_items
  FROM inventory i
  JOIN menu_items mi ON mi.id = i.menu_item_id
  WHERE i.business_id = p_business_id
    AND mi.is_active = true
    AND i.quantity_available = 0;

  -- Total COGS value (cost_per_unit * quantity_available)
  SELECT COALESCE(SUM(i.cost_per_unit * i.quantity_available), 0)
  INTO v_total_cogs_value
  FROM inventory i
  JOIN menu_items mi ON mi.id = i.menu_item_id
  WHERE i.business_id = p_business_id
    AND mi.is_active = true
    AND i.cost_per_unit IS NOT NULL;

  -- Top stocked items (healthy stock, most valuable by COGS)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', mi.name,
      'qty', i.quantity_available,
      'unit', i.unit,
      'last_restocked', i.last_restocked_at::date
    ) ORDER BY (i.cost_per_unit * i.quantity_available) DESC NULLS LAST
  ), '[]'::jsonb)
  INTO v_categories_with_stock
  FROM (
    SELECT i.*, mi.name, (i.cost_per_unit * i.quantity_available) as cogs_value
    FROM inventory i
    JOIN menu_items mi ON mi.id = i.menu_item_id
    WHERE i.business_id = p_business_id
      AND mi.is_active = true
      AND i.quantity_available > COALESCE(i.reorder_level, 0)
    ORDER BY cogs_value DESC NULLS LAST
    LIMIT 5
  ) sub;

  v_result := jsonb_build_object(
    'has_data', true,
    'total_tracked_items', v_total_items,
    'low_stock', v_low_stock_items,
    'out_of_stock', v_out_of_stock_items,
    'healthy_stock_items', v_categories_with_stock,
    'total_cogs_value', v_total_cogs_value
  );

  RETURN v_result;
END;
$$;

-- Grant execute to service role (used by edge functions)
GRANT EXECUTE ON FUNCTION get_ai_inventory_context(UUID) TO service_role;
