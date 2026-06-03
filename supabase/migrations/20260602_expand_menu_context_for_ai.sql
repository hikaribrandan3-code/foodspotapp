-- Expand menu context RPC to include full item details: pricing, calories, tags, margins
-- Now includes: prices, calories, all active tags (spicy, vegan, gluten-free, featured)

CREATE OR REPLACE FUNCTION get_ai_menu_context(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_active', COUNT(*) FILTER (WHERE available IS NOT FALSE),
      'categories', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'name',       c.name,
            'item_count', (
              SELECT COUNT(*) FROM menu_items
              WHERE category_id = c.id AND business_id = p_business_id
                AND available IS NOT FALSE
            ),
            'items', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'name', mi.name,
                  'price', mi.price,
                  'price_display', (mi.price::NUMERIC / 100)::TEXT || ' ARS',
                  'calories', mi.calories,
                  'available', mi.available,
                  'tags', jsonb_build_object(
                    'spicy', COALESCE(mi.is_spicy, false),
                    'vegan', COALESCE(mi.is_vegan, false),
                    'gluten_free', COALESCE(mi.is_gluten_free, false),
                    'featured', COALESCE(mi.featured, false)
                  ),
                  'active_tags', (
                    SELECT COALESCE(jsonb_agg(tag ORDER BY tag), '[]'::jsonb)
                    FROM (
                      SELECT CASE
                        WHEN COALESCE(mi.is_spicy, false) THEN 'Picante'
                        WHEN COALESCE(mi.is_vegan, false) THEN 'Vegano'
                        WHEN COALESCE(mi.is_gluten_free, false) THEN 'Sin TACC'
                        WHEN COALESCE(mi.featured, false) THEN 'Especial'
                      END as tag
                      WHERE COALESCE(mi.is_spicy, false)
                         OR COALESCE(mi.is_vegan, false)
                         OR COALESCE(mi.is_gluten_free, false)
                         OR COALESCE(mi.featured, false)
                    ) tags
                  )
                )
                ORDER BY mi.sort_order
              ), '[]'::jsonb)
              FROM menu_items mi
              WHERE mi.category_id = c.id AND mi.business_id = p_business_id
                AND mi.available IS NOT FALSE
            )
          )
        ), '[]'::JSONB)
        FROM categories c
        WHERE c.business_id = p_business_id AND c.enabled IS NOT FALSE
      ),
      'stats', (
        SELECT jsonb_build_object(
          'total_items', COUNT(*),
          'active_items', COUNT(*) FILTER (WHERE available IS NOT FALSE),
          'avg_price', ROUND(AVG(price)::NUMERIC / 100, 2),
          'avg_calories', ROUND(AVG(COALESCE(calories, 0))::NUMERIC, 0),
          'spicy_items', COUNT(*) FILTER (WHERE is_spicy = true),
          'vegan_items', COUNT(*) FILTER (WHERE is_vegan = true),
          'gluten_free_items', COUNT(*) FILTER (WHERE is_gluten_free = true),
          'featured_items', COUNT(*) FILTER (WHERE featured = true)
        )
        FROM menu_items
        WHERE business_id = p_business_id
      )
    )
    FROM menu_items
    WHERE business_id = p_business_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_menu_context(UUID) TO anon, authenticated, service_role;
