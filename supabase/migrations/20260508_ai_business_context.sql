-- AI Business Context RPCs
-- orders.items is JSONB array: [{name, quantity, price}, ...]
-- Revenue stored as integer cents (ARS minor units)

-- ─── MAIN CONTEXT FUNCTION ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ai_business_context(
  p_business_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  p_start TIMESTAMPTZ;
  prev_start TIMESTAMPTZ;
BEGIN
  p_start   := NOW() - (p_days || ' days')::INTERVAL;
  prev_start := p_start - (p_days || ' days')::INTERVAL;

  SELECT jsonb_build_object(
    'period_days',    p_days,
    'generated_at',   NOW(),
    'has_data',       COUNT(*) > 0,

    -- Revenue
    'revenue_total',  COALESCE(SUM(total), 0),
    'orders_total',   COUNT(*),
    'avg_ticket',     COALESCE(AVG(total)::INTEGER, 0),

    -- Growth vs prior period
    'prev_revenue', (
      SELECT COALESCE(SUM(total), 0)
      FROM orders
      WHERE business_id = p_business_id
        AND created_at >= prev_start AND created_at < p_start
        AND status NOT IN ('cancelled', 'pending_payment')
    ),
    'prev_orders', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE business_id = p_business_id
        AND created_at >= prev_start AND created_at < p_start
        AND status NOT IN ('cancelled', 'pending_payment')
    ),

    -- Peak hour
    'peak_hour', (
      SELECT EXTRACT(HOUR FROM created_at)::INTEGER
      FROM orders
      WHERE business_id = p_business_id
        AND created_at >= p_start
        AND status NOT IN ('cancelled', 'pending_payment')
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY COUNT(*) DESC LIMIT 1
    ),
    'peak_hour_count', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE business_id = p_business_id
        AND created_at >= p_start
        AND status NOT IN ('cancelled', 'pending_payment')
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY COUNT(*) DESC LIMIT 1
    ),

    -- Peak day
    'peak_day', (
      SELECT TRIM(to_char(created_at, 'Day'))
      FROM orders
      WHERE business_id = p_business_id
        AND created_at >= p_start
        AND status NOT IN ('cancelled', 'pending_payment')
      GROUP BY date_trunc('day', created_at), to_char(created_at, 'Day')
      ORDER BY SUM(total) DESC LIMIT 1
    ),

    -- Top 5 items from JSONB array
    'top_items', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'name',       item_name,
          'units_sold', total_qty,
          'revenue',    total_rev
        ) ORDER BY total_qty DESC
      ), '[]'::JSONB)
      FROM (
        SELECT
          item->>'name'                                          AS item_name,
          SUM((item->>'quantity')::INTEGER)                     AS total_qty,
          SUM((item->>'price')::INTEGER * (item->>'quantity')::INTEGER) AS total_rev
        FROM orders o,
             jsonb_array_elements(
               CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::JSONB END
             ) AS item
        WHERE o.business_id = p_business_id
          AND o.created_at >= p_start
          AND o.status NOT IN ('cancelled', 'pending_payment')
          AND item->>'name' IS NOT NULL
        GROUP BY item->>'name'
        ORDER BY total_qty DESC
        LIMIT 5
      ) t
    ),

    -- Order types breakdown
    'order_types', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('type', order_type, 'count', cnt)
        ORDER BY cnt DESC
      ), '[]'::JSONB)
      FROM (
        SELECT COALESCE(order_type, 'other') AS order_type, COUNT(*) AS cnt
        FROM orders
        WHERE business_id = p_business_id
          AND created_at >= p_start
          AND status NOT IN ('cancelled', 'pending_payment')
        GROUP BY order_type
      ) ot
    ),

    -- Payment methods
    'payment_methods', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('method', pm, 'count', cnt)
        ORDER BY cnt DESC
      ), '[]'::JSONB)
      FROM (
        SELECT COALESCE(payment_method, 'unknown') AS pm, COUNT(*) AS cnt
        FROM orders
        WHERE business_id = p_business_id
          AND created_at >= p_start
          AND status NOT IN ('cancelled', 'pending_payment')
          AND payment_method IS NOT NULL
        GROUP BY payment_method
      ) pm
    )
  )
  INTO result
  FROM orders
  WHERE business_id = p_business_id
    AND created_at >= p_start
    AND status NOT IN ('cancelled', 'pending_payment');

  RETURN COALESCE(result, jsonb_build_object(
    'period_days',   p_days,
    'has_data',      false,
    'orders_total',  0,
    'revenue_total', 0,
    'avg_ticket',    0,
    'top_items',     '[]'::JSONB,
    'order_types',   '[]'::JSONB,
    'payment_methods', '[]'::JSONB
  ));
END;
$$;

-- ─── MENU CONTEXT ─────────────────────────────────────────────────────────
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
            'sample_items', (
              SELECT jsonb_agg(jsonb_build_object('name', mi2.name, 'price', mi2.price))
              FROM (
                SELECT name, price FROM menu_items
                WHERE category_id = c.id AND business_id = p_business_id
                  AND available IS NOT FALSE
                ORDER BY sort_order LIMIT 3
              ) mi2
            )
          )
        ), '[]'::JSONB)
        FROM categories c
        WHERE c.business_id = p_business_id AND c.enabled IS NOT FALSE
      )
    )
    FROM menu_items
    WHERE business_id = p_business_id
  );
END;
$$;

-- ─── INDEXES for performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_ai_context
  ON orders(business_id, created_at DESC, status)
  INCLUDE (total, order_type, payment_method);

-- ─── GRANT to anon/authenticated (SECURITY DEFINER bypasses RLS safely) ───
GRANT EXECUTE ON FUNCTION get_ai_business_context(UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ai_menu_context(UUID) TO anon, authenticated, service_role;
