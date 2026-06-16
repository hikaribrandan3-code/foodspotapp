-- ============================================================================
-- 2026-06-16  UGC ACTIVATION STATES TABLE (Bug #4 Fix)
-- ============================================================================
-- WHY:
--   ugc_activations (existing) is OWNER CONFIG — one row per business,
--   stores activation_trigger ENUM + enabled BOOLEAN.
--
--   useCameraActivation.js treats it as a PER-ORDER state machine:
--   order_id + user_id + status ('pending'|'shown'|'captured'|'dismissed').
--   This causes "column ugc_activations.status does not exist" on every
--   customer order, breaking post-delivery camera activation.
--
-- FIX:
--   Create ugc_activation_states for per-order tracking.
--   Leave ugc_activations intact as owner config.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ugc_activation_states (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id        UUID        REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id         TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'waiting', 'shown', 'captured', 'shared', 'dismissed')),
    order_type      TEXT,
    delivered_at    TIMESTAMPTZ,
    banner_shown_at TIMESTAMPTZ,
    captured_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(order_id, user_id)
);

ALTER TABLE public.ugc_activation_states ENABLE ROW LEVEL SECURITY;

-- Customers (anon) can read/write their own activations.
-- Rows are scoped by order_id + user_id — no auth token needed.
CREATE POLICY "anon_select_ugc_activation_states"
    ON public.ugc_activation_states FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_ugc_activation_states"
    ON public.ugc_activation_states FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_ugc_activation_states"
    ON public.ugc_activation_states FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Authenticated (owner) can read all.
CREATE POLICY "auth_select_ugc_activation_states"
    ON public.ugc_activation_states FOR SELECT TO authenticated USING (true);
