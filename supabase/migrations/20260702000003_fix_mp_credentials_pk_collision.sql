-- ============================================================
-- FIX: set_mp_credentials PK collision on branding_secrets
-- ============================================================
-- Root cause: the RPC forced branding_secrets.id = branding.id (copying the
-- BIGINT branding row id). branding_secrets.id is its own independent
-- primary key (not 1:1 with branding.id), so a different business's row can
-- already occupy that id number -> "duplicate key value violates unique
-- constraint branding_secrets_pkey" on INSERT, before the ON CONFLICT
-- (business_id) branch is ever reached.
--
-- Fix: stop passing id at all. Let branding_secrets.id use its own DEFAULT
-- (gen_random_uuid() or identity, whatever the column default is) and rely
-- solely on the business_id unique constraint for upsert matching.

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
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id = p_business_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized for this business';
    END IF;

    INSERT INTO public.branding_secrets (business_id, mp_access_token, mp_user_id, updated_at)
    VALUES (p_business_id, p_access_token, p_user_id, NOW())
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

GRANT EXECUTE ON FUNCTION public.set_mp_credentials(UUID, TEXT, TEXT) TO authenticated;
