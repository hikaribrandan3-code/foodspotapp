-- ============================================================
-- SECURE MP TOKENS — STEP 3: defensive guards (no-op on current schema)
-- ============================================================
-- Context: the live `branding` table never actually had mp_access_token or
-- the refresh/expires/public_key/connected_at columns — code tried to write
-- there but the columns didn't exist, so they're already absent.
--
-- This migration uses DROP IF EXISTS as a safety guard: if someone ever
-- accidentally adds raw tokens back to branding in the future, this ensures
-- they get removed. Currently a no-op.
--
-- mp_user_id stays — it's a public merchant account id (not a credential),
-- and mp-webhook/mp-event-webhook use it (on branding_secrets) to look up
-- which tenant owns a payment.

ALTER TABLE public.branding
    DROP COLUMN IF EXISTS mp_access_token,
    DROP COLUMN IF EXISTS mp_refresh_token,
    DROP COLUMN IF EXISTS mp_token_expires_at,
    DROP COLUMN IF EXISTS mp_public_key,
    DROP COLUMN IF EXISTS mp_connected_at;
