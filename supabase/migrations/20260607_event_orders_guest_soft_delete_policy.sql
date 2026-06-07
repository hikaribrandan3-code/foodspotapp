-- ========================================================
-- Allow guests to soft-delete their own event orders
-- Date: 2026-06-07
-- Reason: Customers need to hide tickets from My Tickets view
-- Pattern: Matches existing guest_read policy (x-guest-token + x-business-id headers)
-- ========================================================

CREATE POLICY "event_orders_guest_soft_delete"
ON public.event_orders FOR UPDATE
USING (
    guest_token = current_setting('request.headers', true)::json->>'x-guest-token'
    AND
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
)
WITH CHECK (
    guest_token = current_setting('request.headers', true)::json->>'x-guest-token'
    AND
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);
