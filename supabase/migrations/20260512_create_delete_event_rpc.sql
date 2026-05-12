-- PRODUCTION-GRADE FIX: RPC function for event deletion
-- Bypasses RLS trigger/permission issues while enforcing strict ownership.
-- SECURITY DEFINER runs as postgres (bypasses RLS), but we verify auth.uid() owns the business.

CREATE OR REPLACE FUNCTION public.delete_event(
    p_event_id UUID,
    p_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- 1. Verify the requesting user owns this business
    SELECT owner_id INTO v_owner_id
    FROM public.businesses
    WHERE id = p_business_id;

    IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
        RETURN false; -- Not the owner
    END IF;

    -- 2. Delete the event (cascade handles event_orders, event_checkins)
    DELETE FROM public.events
    WHERE id = p_event_id
      AND business_id = p_business_id;

    -- 3. Return true if we actually deleted something
    RETURN FOUND;
END;
$$;

-- Expose via PostgREST
GRANT EXECUTE ON FUNCTION public.delete_event(UUID, UUID) TO anon, authenticated;
