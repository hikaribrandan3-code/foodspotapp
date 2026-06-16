-- ============================================================================
-- 2026-06-16  LOYALTY EARN TRIGGER FIX  (Database Bible v2.4)
-- ============================================================================
-- WHY:
--   The award_loyalty_points_on_order_confirmed trigger reads NEW.total
--   (NUMERIC pesos, e.g. 9000) but compares to min_order_cents (INTEGER cents,
--   e.g. 800000). This pesos-vs-cents mismatch meant no orders ever qualified.
--   Example: a 9000-peso order (900000 cents) reads as 9000 in the trigger,
--   compares 9000 >= 800000 ✓, but 9000 < 800000 ✗ → no points awarded.
--
-- FIX:
--   Read NEW.total_cents (INTEGER cents) instead of NEW.total (NUMERIC pesos).
--   The orders table maintains both columns; total_cents is the canonical form
--   for all amount comparisons (matches min_order_cents units).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_order_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_business_id    UUID;
    v_phone          TEXT;
    v_total          INT;
    v_settings       RECORD;
    v_points         INT;
BEGIN
    IF NEW.status = 'released_to_kitchen'
       AND (OLD.status IS NULL OR OLD.status != 'released_to_kitchen')
    THEN
        v_business_id := NEW.business_id;
        v_phone       := NEW.customer_phone;
        v_total       := NEW.total_cents;  -- FIX: read cents, not pesos

        IF v_phone IS NULL THEN RETURN NEW; END IF;

        SELECT * INTO v_settings
        FROM public.loyalty_settings
        WHERE business_id = v_business_id AND enabled = true
        LIMIT 1;

        IF v_settings IS NULL THEN RETURN NEW; END IF;

        IF v_total >= v_settings.min_order_cents THEN
            v_points := v_settings.points_per_order;

            -- Award points: (p_business_id, p_phone, p_delta)
            PERFORM public.increment_loyalty_points(v_business_id, v_phone, v_points);

            -- Log: correct column is points_delta
            INSERT INTO public.loyalty_transactions
                (business_id, customer_phone, order_id, type, points_delta, created_at)
            SELECT v_business_id, v_phone, NEW.id, 'earn', v_points, NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM public.loyalty_transactions
                WHERE business_id = v_business_id
                  AND order_id    = NEW.id
                  AND type        = 'earn'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
