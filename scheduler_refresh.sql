-- ========================================================
-- STRIKE 6: THE ETERNAL HANDSHAKE (SCHEDULER)
-- ========================================================

-- Enable cron if not already
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Verify extensions
-- select * from pg_extension;

-- Schedule the 'refresh-tokens' job to run every Sunday at Midnight (0 0 * * 0)
-- REPLACE 'YOUR_PROJECT_REF', 'YOUR_SERVICE_ROLE_KEY' (or match the function auth)

select cron.schedule(
    'refresh-tokens-weekly',  -- job name
    '0 0 * * 0',              -- schedule: Sunday at 00:00
    $$
    select
        net.http_post(
            url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-tokens',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Note:
-- The Edge Function 'refresh-tokens' requires the following ENV VARS set in Supabase:
-- 1. SUPABASE_URL
-- 2. SUPABASE_SERVICE_ROLE_KEY
-- 3. MP_CLIENT_ID (From Mercado Pago Dashboard)
-- 4. MP_CLIENT_SECRET (From Mercado Pago Dashboard)
