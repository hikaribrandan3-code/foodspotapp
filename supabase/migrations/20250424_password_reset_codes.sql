-- password_reset_codes: stores custom 6-digit OTP codes for password reset
create table if not exists public.password_reset_codes (
    id uuid default gen_random_uuid() primary key,
    email text not null,
    code text not null,
    created_at timestamptz default now() not null,
    expires_at timestamptz default (now() + interval '10 minutes') not null,
    used boolean default false not null
);

-- Fast lookup by email + code
create index if not exists idx_password_reset_codes_email_code
    on public.password_reset_codes(email, code);

-- Auto-cleanup: delete expired codes older than 1 hour to keep table lean
create index if not exists idx_password_reset_codes_expires_at
    on public.password_reset_codes(expires_at);

-- Edge functions use service role key and bypass RLS.
-- Deny all access from anon/authenticated roles — only service role can touch this table.
alter table public.password_reset_codes enable row level security;

-- Helper: look up auth user ID by email (called from edge functions via RPC)
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
begin
    select id into v_user_id
    from auth.users
    where email = p_email
    limit 1;
    return v_user_id;
end;
$$;
