-- ============================================================
-- SECURE MP TOKENS — STEP 1: branding_secrets schema + backfill
-- ============================================================
-- Context: public.branding is readable by anon (branding_public_read policy)
-- and currently stores mp_access_token in plaintext — any anon-key request
-- can read every tenant's live Mercado Pago access token. branding_secrets
-- already exists with RLS enabled and no anon/authenticated policy, but is
-- missing columns some edge functions (mp-oauth) already assume exist.
--
-- This migration only ADDS columns and BACKFILLS data. It does not remove
-- anything from `branding` yet — run and verify this one first, then apply
-- 20260702000002_secure_mp_tokens_drop_from_branding.sql separately.

-- 1. Bring branding_secrets up to the shape mp-oauth/refresh-tokens expect.
ALTER TABLE public.branding_secrets
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id),
    ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS mp_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS mp_public_key TEXT,
    ADD COLUMN IF NOT EXISTS mp_connected_at TIMESTAMPTZ;

-- 2. business_id needs to be unique so upserts (mp-oauth, set_mp_credentials
--    RPC) can target ON CONFLICT (business_id).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'branding_secrets_business_id_key'
    ) THEN
        ALTER TABLE public.branding_secrets
            ADD CONSTRAINT branding_secrets_business_id_key UNIQUE (business_id);
    END IF;
END $$;

-- 3. Schema note: live `branding` never actually had mp_access_token (or the
--    refresh/expires/public_key/connected_at columns) — the code tried to write
--    there but the column didn't exist, so tokens were never persisting.
--    branding_secrets is the fresh, correct home. No backfill needed; going
--    forward, mp-oauth and OwnerSummary write directly to branding_secrets via RPCs.
--    (Already ensured business_id is unique above, so upserts will work.)

-- ── VERIFY BEFORE PROCEEDING TO STEP 3 (the DROP migration) ──
-- Run this and confirm the two counts match:
--   SELECT count(*) FROM public.branding WHERE mp_access_token IS NOT NULL;
--   SELECT count(*) FROM public.branding_secrets WHERE mp_access_token IS NOT NULL;
