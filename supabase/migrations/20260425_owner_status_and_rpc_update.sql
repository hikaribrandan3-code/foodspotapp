-- ============================================
-- 🎯 OWNER_STATUS COLUMN + RPC UPDATE
-- ============================================
-- 1. Add owner_status text column (nullable)
-- 2. Update advance_order_status RPC to set owner_status
-- 3. Add cancellation support to advance_order_status
-- ============================================

-- ============================================
-- 1. ADD owner_status COLUMN
-- ============================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS owner_status TEXT;

-- Backfill: copy current English status values into owner_status
UPDATE public.orders
SET owner_status = status
WHERE owner_status IS NULL
  AND status IN (
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

-- ============================================
-- 2. UPDATE RPC: advance_order_status
-- ============================================
-- Now sets owner_status alongside status,
-- and supports cancellation from any non-terminal state.
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

    -- 🆕 CANCELLATION: allowed from any non-terminal state
    IF p_target_status = 'cancelled' AND v_current_status NOT IN ('delivered', 'cancelled', 'refunded') THEN
        v_allowed := true;

    ELSE
        CASE v_current_status
            -- ❌ pending_payment: ONLY webhook or cancel can advance
            WHEN 'pending_payment' THEN
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

            -- Terminal states: no exit (except cancel, handled above)
            WHEN 'delivered' THEN
                v_allowed := false;
            WHEN 'refunded' THEN
                v_allowed := false;

            ELSE
                v_allowed := false;
        END CASE;
    END IF;

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
        owner_status = p_target_status,
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
