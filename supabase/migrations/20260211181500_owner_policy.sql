-- ========================================================
-- STRIKE 5: OWNER COMMAND CENTER POLICY (PATCHED 2026-02-11)
-- ========================================================

-- We already enabled RLS on 'orders' in Phase 4.
-- Now we need to allow the Business Owner to see THEIR orders.
-- Since we don't have full Auth yet, we use the "Transient Key" approach.
-- PROMPT: "Since we aren't using full Auth yet, use the business_id as the temporary key for this policy."

-- Policy: Allow SELECT if the request header 'x-business-id' matches the row's 'business_id'.
-- The Owner Dashboard (Dashboard.jsx) sets this header automatically.
-- PATCH: Added ::uuid cast to header value

CREATE POLICY "Owner Select Own Orders" ON orders
FOR SELECT
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);

-- Policy: Allow UPDATE if the request header 'x-business-id' matches.
-- This allows the Owner to change status (e.g. 'confirmado' -> 'en_cocina').

CREATE POLICY "Owner Update Own Orders" ON orders
FOR UPDATE
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
)
WITH CHECK (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);
-- Note: The 'WITH CHECK' ensures they can't change the business_id of a row to someone else's.

-- Summary of Orders Policies:
-- 1. "Customer Isolation": SELECT (guest_token match)
-- 2. "Public Insert": INSERT (everyone)
-- 3. "Owner Select": SELECT (business_id match)
-- 4. "Owner Update": UPDATE (business_id match)
