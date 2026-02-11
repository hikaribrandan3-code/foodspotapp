-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Verify extensions are active
-- select * from pg_extension;

-- Schedule the 'cleanup-orphans' job to run every hour (0 * * * *)
-- REPLACE 'YOUR_PROJECT_REF' and 'YOUR_ANON_KEY' below!

select cron.schedule(
    'cleanup-orphans-hourly', -- name of the job
    '0 * * * *',              -- schedule: every hour at minute 0
    $$
    select
        net.http_post(
            url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-orphans',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Note: We use SERVICE_ROLE_KEY in the header if the function enforces it, 
-- or ANON_KEY if the function handles its own auth (which it does via env).
-- But usually Edge Functions are protected.
-- 'cleanup-orphans' uses valid JWT by default unless --no-verify-jwt.
-- If --no-verify-jwt is used, any key works, but good practice to pass one.
-- Actually, the function code in index.ts doesn't check the Auth header, it checks environment variables.
-- But Supabase Gateway checks the header.
-- Use SERVICE_ROLE_KEY to bypass any RLS/Auth restrictions at the gateway level if needed.
