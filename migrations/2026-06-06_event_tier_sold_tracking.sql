-- ============================================
-- EVENT TIER SOLD COUNT TRACKING
-- Increments sold count when payment is confirmed
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_event_tier_sold(
    p_tier_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_sold INTEGER;
BEGIN
    UPDATE public.event_tiers
    SET sold = sold + p_quantity,
        updated_at = NOW()
    WHERE id = p_tier_id
    RETURNING sold INTO v_new_sold;

    IF v_new_sold IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tier not found'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_sold', v_new_sold
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_event_tier_sold(UUID, INTEGER)
  TO service_role;
