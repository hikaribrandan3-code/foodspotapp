-- FIX: Event DELETE fails because recalc_event_stats trigger tries to UPDATE
-- an event row that is being deleted (cascade from event_orders/event_checkins).
-- Guard the UPDATE so it only runs if the event still exists.

CREATE OR REPLACE FUNCTION public.recalc_event_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_event_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_event_id := OLD.event_id;
    ELSE
        v_event_id := NEW.event_id;
    END IF;

    -- Skip if the event itself is being deleted (no row to update)
    IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = v_event_id) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    UPDATE public.events
    SET
        tickets_sold = COALESCE((
            SELECT SUM(quantity) FROM public.event_orders
            WHERE event_id = v_event_id AND payment_status = 'paid'
        ), 0),
        total_revenue_cents = COALESCE((
            SELECT SUM(total_cents) FROM public.event_orders
            WHERE event_id = v_event_id AND payment_status = 'paid'
        ), 0),
        checkins_count = COALESCE((
            SELECT COUNT(*) FROM public.event_checkins
            WHERE event_id = v_event_id
        ), 0),
        updated_at = NOW()
    WHERE id = v_event_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
