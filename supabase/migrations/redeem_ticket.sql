-- ============================================
-- STRIKE 4: TICKET REDEMPTION RPC
-- ============================================
-- Atomic ticket redemption: prevents double-scan.
-- Called by staff scanner with order_id + business_id.
-- Returns JSON with success status and customer info.
-- ============================================

create or replace function redeem_ticket(p_order_id uuid, p_business_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_order record;
begin
    -- Lock the row to prevent concurrent redemption
    select * into v_order
    from orders
    where id = p_order_id
      and business_id = p_business_id
    for update;

    -- Order not found
    if not found then
        return jsonb_build_object(
            'success', false,
            'error', 'NOT_FOUND',
            'message', 'Entrada no encontrada para este negocio.'
        );
    end if;

    -- Already redeemed
    if (v_order.mp_payment_data->>'ticket_redeemed')::boolean = true then
        return jsonb_build_object(
            'success', false,
            'error', 'ALREADY_REDEEMED',
            'message', 'Esta entrada ya fue canjeada.',
            'redeemed_at', v_order.mp_payment_data->>'ticket_redeemed_at',
            'customer_name', v_order.customer_name
        );
    end if;

    -- Check order status (must be paid/confirmed)
    if v_order.status not in ('paid_unreleased', 'released_to_kitchen', 'preparing', 'ready', 'delivered') then
        return jsonb_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'message', 'El pedido no tiene un pago confirmado. Estado: ' || v_order.status
        );
    end if;

    -- Mark as redeemed (atomic update)
    update orders
    set mp_payment_data = coalesce(mp_payment_data, '{}'::jsonb) || jsonb_build_object(
        'ticket_redeemed', true,
        'ticket_redeemed_at', now()::text
    )
    where id = p_order_id;

    return jsonb_build_object(
        'success', true,
        'message', '¡Entrada válida!',
        'customer_name', v_order.customer_name,
        'order_number', v_order.order_number,
        'items', v_order.items
    );
end;
$$;
