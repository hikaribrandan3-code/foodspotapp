-- ============================================
-- 🎯 EXTEND advance_order_status RPC
-- ============================================
-- Goals:
--   1. Auto-set transition timestamps (started_at, ready_at, delivered_at, cancelled_at)
--      to match what the legacy transition_order_state RPC did.
--   2. Add optional p_cancel_reason parameter so callers can record WHY a cancel happened.
--   3. Keep signature backward-compatible: p_cancel_reason has a default value, so
--      every existing caller still works without changes.
--   4. Audit log to order_transitions remains automatic.
-- ============================================

CREATE OR REPLACE FUNCTION advance_order_status(
    p_order_id UUID,
    p_target_status TEXT,
    p_cancel_reason TEXT DEFAULT NULL
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
    v_actor_id := auth.uid();

    -- 🔒 LOCK THE ROW (prevents double-click race conditions)
    SELECT status, order_type INTO v_current_status, v_order_type
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ORDER_NOT_FOUND',
            'message', 'Pedido no encontrado'
        );
    END IF;

    -- Idempotency: already at target
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
            WHEN 'pending_payment' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'PAYMENT_PENDING',
                    'message', 'Esperando pago. Solo el webhook puede confirmar.'
                );

            WHEN 'paid_unreleased' THEN
                IF p_target_status = 'released_to_kitchen' THEN
                    v_allowed := true;
                END IF;

            WHEN 'released_to_kitchen' THEN
                IF p_target_status = 'preparing' THEN
                    v_allowed := true;
                END IF;

            WHEN 'preparing' THEN
                IF p_target_status = 'ready' THEN
                    v_allowed := true;
                END IF;

            WHEN 'ready' THEN
                IF p_target_status = 'dispatched' AND v_order_type = 'delivery' THEN
                    v_allowed := true;
                ELSIF p_target_status = 'delivered' AND v_order_type != 'delivery' THEN
                    v_allowed := true;
                END IF;

            WHEN 'dispatched' THEN
                IF p_target_status = 'delivered' THEN
                    v_allowed := true;
                END IF;

            WHEN 'delivered' THEN
                v_allowed := false;
            WHEN 'refunded' THEN
                v_allowed := false;

            ELSE
                v_allowed := false;
        END CASE;
    END IF;

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
    -- ✅ EXECUTE THE TRANSITION (with timestamps)
    -- ============================================
    -- Each timestamp is set ONLY when transitioning INTO that status,
    -- and only if it hasn't been set before (preserves first-touch time).
    UPDATE public.orders
    SET status         = p_target_status,
        owner_status   = p_target_status,
        updated_at     = now(),
        started_at     = CASE WHEN p_target_status = 'preparing' AND started_at IS NULL   THEN now() ELSE started_at END,
        ready_at       = CASE WHEN p_target_status = 'ready'     AND ready_at IS NULL     THEN now() ELSE ready_at END,
        delivered_at   = CASE WHEN p_target_status = 'delivered' AND delivered_at IS NULL THEN now() ELSE delivered_at END,
        cancelled_at   = CASE WHEN p_target_status = 'cancelled' AND cancelled_at IS NULL THEN now() ELSE cancelled_at END,
        cancel_reason  = CASE WHEN p_target_status = 'cancelled' AND p_cancel_reason IS NOT NULL THEN p_cancel_reason ELSE cancel_reason END
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

NOTIFY pgrst, 'reload config';
