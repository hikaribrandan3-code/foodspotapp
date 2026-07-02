-- ============================================================
-- SECURE MP TOKENS — STEP 2: ownership-checked read/write RPCs
-- ============================================================
-- branding_secrets has RLS enabled with no anon/authenticated policy, so the
-- owner's browser client cannot read or write it directly. These RPCs are
-- the only door in: SECURITY DEFINER, but each one verifies the caller owns
-- the business before touching a row.

CREATE OR REPLACE FUNCTION public.get_mp_credentials(p_business_id UUID)
RETURNS TABLE (mp_access_token TEXT, mp_user_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id = p_business_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized for this business';
    END IF;

    RETURN QUERY
    SELECT bs.mp_access_token, bs.mp_user_id
    FROM public.branding_secrets bs
    WHERE bs.business_id = p_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_mp_credentials(
    p_business_id UUID,
    p_access_token TEXT DEFAULT NULL,
    p_user_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_branding_id BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id = p_business_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized for this business';
    END IF;

    SELECT id INTO v_branding_id FROM public.branding WHERE business_id = p_business_id;

    INSERT INTO public.branding_secrets (id, business_id, mp_access_token, mp_user_id, updated_at)
    VALUES (v_branding_id, p_business_id, p_access_token, p_user_id, NOW())
    ON CONFLICT (business_id) DO UPDATE SET
        mp_access_token = COALESCE(p_access_token, branding_secrets.mp_access_token),
        mp_user_id      = COALESCE(p_user_id, branding_secrets.mp_user_id),
        updated_at      = NOW();

    -- mp_user_id is non-secret (a public merchant account id) and stays
    -- mirrored on branding so the rest of the app (and the fallback lookup
    -- in mp-webhook by mp_user_id) keeps working without extra round trips.
    UPDATE public.branding
    SET mp_user_id = COALESCE(p_user_id, mp_user_id)
    WHERE business_id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_mp_credentials(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_mp_credentials(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mp_credentials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_mp_credentials(UUID, TEXT, TEXT) TO authenticated;
