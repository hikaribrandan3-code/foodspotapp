-- ========================================================
-- STRIKE 4: RLS & PERIMETER LOCK (PATCHED 2026-02-11)
-- ========================================================

-- 1. ORDERS TABLE PRIVACY
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Customers to View THEIR OWN Orders (Guest Token Match)
-- The 'x-guest-token' header is injected by the frontend (supabaseClient.js)
-- PATCH: Added ::uuid cast to header value
CREATE POLICY "Customer Select Own Orders" ON orders
FOR SELECT
USING (
    guest_token = (current_setting('request.headers', true)::json->>'x-guest-token')::uuid
);

-- Policy: Allow Anyone to Create an Order (Public Checkout)
-- But they cannot overwrite others (INSERT only)
CREATE POLICY "Public Insert Orders" ON orders
FOR INSERT
WITH CHECK (true);

-- Policy: Service Role (God Mode)
-- Service Role bypasses RLS by default, so no policy needed for it.


-- 2. BRANDING SECRETS PROTECTION
-- Enable RLS
ALTER TABLE branding_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role ONLY
-- We explicitly create NO policies for 'anon' or 'authenticated'.
-- This means ONLY the Service Role (which bypasses RLS) can read/write.
-- The Frontend has 0 access. This securely hides 'mp_access_token'.


-- 3. REAL-TIME SECURITY
-- Realtime respects the SELECT policies above.
