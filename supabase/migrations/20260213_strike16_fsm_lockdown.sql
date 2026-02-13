-- ============================================
-- 🎯 STRIKE 16: FSM LOCKDOWN MIGRATION
-- ============================================
-- Enforces strict order lifecycle with:
-- 1. Status enum type
-- 2. Safe data migration from old strings
-- 3. Audit trail table (order_transitions)
-- 4. advance_order_status RPC with row locking
-- ============================================

-- ============================================
-- 1. CREATE THE ENUM TYPE
-- ============================================
-- Using TEXT with CHECK constraint instead of ENUM
-- (Easier to add new statuses later without ALTER TYPE)
-- But we DO create the type for documentation/clarity

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE order_status_enum AS ENUM (
            'cart',
            'pending_payment',
            'paid_unreleased',
            'released_to_kitchen',
            'preparing',
            'ready',
            'dispatched',
            'delivered',
            'refunded',
            'cancelled'
        );
    END IF;
END
$$;

-- ============================================
-- 2. SAFE DATA MIGRATION
-- ============================================
-- Map old ad-hoc strings → new FSM values
-- This is IDEMPOTENT: running it twice won't break anything

-- Old: awaiting_payment → New: pending_payment
UPDATE public.orders SET status = 'pending_payment'
WHERE status = 'awaiting_payment';

-- Old: pendiente_confirmacion → New: pending_payment
UPDATE public.orders SET status = 'pending_payment'
WHERE status = 'pendiente_confirmacion';

-- Old: confirmado → New: released_to_kitchen
UPDATE public.orders SET status = 'released_to_kitchen'
WHERE status = 'confirmado';

-- Old: en_cocina / preparando → New: preparing
UPDATE public.orders SET status = 'preparing'
WHERE status IN ('en_cocina', 'preparando');

-- Old: listo → New: ready
UPDATE public.orders SET status = 'ready'
WHERE status = 'listo';

-- Old: en_camino → New: dispatched
UPDATE public.orders SET status = 'dispatched'
WHERE status = 'en_camino';

-- Old: entregado → New: delivered
UPDATE public.orders SET status = 'delivered'
WHERE status = 'entregado';

-- ============================================
-- 3. ADD CHECK CONSTRAINT
-- ============================================
-- Prevent any invalid status string from being inserted
-- This is the "iron cage" that replaces the enum on the column

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check CHECK (
    status IN (
        'cart',
        'pending_payment',
        'paid_unreleased',
        'released_to_kitchen',
        'preparing',
        'ready',
        'dispatched',
        'delivered',
        'refunded',
        'cancelled'
    )
);

-- ============================================
-- 4. AUDIT TRAIL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    actor_id UUID,  -- NULL for system/webhook transitions
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_order_transitions_order_id
ON public.order_transitions(order_id);

-- Index for fast lookup by time (reconciliation)
CREATE INDEX IF NOT EXISTS idx_order_transitions_created_at
ON public.order_transitions(created_at DESC);

-- RLS: Staff can see transitions for their business orders
ALTER TABLE public.order_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view order transitions"
ON public.order_transitions FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders
        WHERE business_id IN (
            SELECT business_id FROM public.branding WHERE owner_id = auth.uid()
        )
    )
);

-- System (service role) can insert
CREATE POLICY "System can insert transitions"
ON public.order_transitions FOR INSERT
WITH CHECK (true);

-- ============================================
-- 5. THE RPC: advance_order_status
-- ============================================
-- 🛡️ ROW-LOCKED, TRANSITION-VALIDATED, AUDIT-LOGGED
-- Called from StaffDashboard via supabase.rpc()
-- ============================================

CREATE OR REPLACE FUNCTION advance_order_status(
    p_order_id UUID,
    p_target_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
    v_order_type TEXT;
    v_actor_id UUID;
    v_allowed BOOLEAN := false;
BEGIN
    -- Get the calling user
    v_actor_id := auth.uid();

    -- 🔒 LOCK THE ROW (prevents double-click race conditions)
    SELECT status, order_type INTO v_current_status, v_order_type
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    -- Order not found
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ORDER_NOT_FOUND',
            'message', 'Pedido no encontrado'
        );
    END IF;

    -- Already at target (idempotency guard)
    IF v_current_status = p_target_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', v_current_status,
            'message', 'Ya está en ese estado'
        );
    END IF;

    -- ============================================
    -- 🛡️ TRANSITION VALIDATION (THE IRON CAGE)
    -- ============================================
    -- Each CASE defines the ONLY valid exits from that status
    
    CASE v_current_status
        -- ❌ pending_payment: ONLY webhook can advance this
        WHEN 'pending_payment' THEN
            -- Manual staff cannot advance payment states
            RETURN jsonb_build_object(
                'success', false,
                'error', 'PAYMENT_PENDING',
                'message', 'Esperando pago. Solo el webhook puede confirmar.'
            );

        -- ✅ paid_unreleased → released_to_kitchen (Owner Accept)
        WHEN 'paid_unreleased' THEN
            IF p_target_status = 'released_to_kitchen' THEN
                v_allowed := true;
            END IF;

        -- ✅ released_to_kitchen → preparing
        WHEN 'released_to_kitchen' THEN
            IF p_target_status = 'preparing' THEN
                v_allowed := true;
            END IF;

        -- ✅ preparing → ready
        WHEN 'preparing' THEN
            IF p_target_status = 'ready' THEN
                v_allowed := true;
            END IF;

        -- ✅ ready → dispatched (delivery) OR delivered (pickup/dine-in)
        WHEN 'ready' THEN
            IF p_target_status = 'dispatched' AND v_order_type = 'delivery' THEN
                v_allowed := true;
            ELSIF p_target_status = 'delivered' AND v_order_type != 'delivery' THEN
                v_allowed := true;
            END IF;

        -- ✅ dispatched → delivered
        WHEN 'dispatched' THEN
            IF p_target_status = 'delivered' THEN
                v_allowed := true;
            END IF;

        -- Terminal states: no exit
        WHEN 'delivered' THEN
            v_allowed := false;
        WHEN 'cancelled' THEN
            v_allowed := false;
        WHEN 'refunded' THEN
            v_allowed := false;

        ELSE
            v_allowed := false;
    END CASE;

    -- ❌ INVALID TRANSITION
    IF NOT v_allowed THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TRANSITION',
            'message', format('No se puede pasar de "%s" a "%s"', v_current_status, p_target_status),
            'current_status', v_current_status,
            'target_status', p_target_status
        );
    END IF;

    -- ============================================
    -- ✅ EXECUTE THE TRANSITION
    -- ============================================
    UPDATE public.orders
    SET status = p_target_status,
        updated_at = now()
    WHERE id = p_order_id;

    -- 📝 AUDIT LOG
    INSERT INTO public.order_transitions (order_id, from_status, to_status, actor_id)
    VALUES (p_order_id, v_current_status, p_target_status, v_actor_id);

    RETURN jsonb_build_object(
        'success', true,
        'from_status', v_current_status,
        'to_status', p_target_status,
        'message', format('Pedido actualizado: %s → %s', v_current_status, p_target_status)
    );
END;
$$;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
