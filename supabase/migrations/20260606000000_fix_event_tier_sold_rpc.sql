-- ============================================================
-- FIX: increment_event_tier_sold RPC
--
-- Previous migration targeted public.event_tiers (non-existent).
-- Tiers are JSONB array inside events.ticket_tiers:
--   [{id TEXT, name TEXT, price_cents INT, capacity INT, sold INT}, ...]
--
-- This RPC atomically increments sold inside the JSONB array
-- for the matching tier, identified by string id.
-- FOR UPDATE row lock prevents concurrent double-counting.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_event_tier_sold(
    p_event_id  UUID,
    p_tier_id   TEXT,
    p_quantity  INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_tiers  JSONB;
    v_new_tiers  JSONB := '[]'::jsonb;
    v_tier       JSONB;
    v_found      BOOLEAN := false;
    v_new_sold   INTEGER;
    i            INTEGER;
BEGIN
    SELECT ticket_tiers
    INTO v_old_tiers
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF v_old_tiers IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    FOR i IN 0 .. jsonb_array_length(v_old_tiers) - 1 LOOP
        v_tier := v_old_tiers -> i;
        IF v_tier->>'id' = p_tier_id THEN
            v_new_sold := COALESCE((v_tier->>'sold')::integer, 0) + p_quantity;
            v_tier := jsonb_set(v_tier, '{sold}', to_jsonb(v_new_sold));
            v_found := true;
        END IF;
        v_new_tiers := v_new_tiers || jsonb_build_array(v_tier);
    END LOOP;

    IF NOT v_found THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tier not found');
    END IF;

    UPDATE public.events
    SET ticket_tiers = v_new_tiers,
        updated_at   = NOW()
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success',  true,
        'event_id', p_event_id,
        'tier_id',  p_tier_id,
        'new_sold', v_new_sold
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_event_tier_sold(UUID, TEXT, INTEGER)
    TO service_role;
