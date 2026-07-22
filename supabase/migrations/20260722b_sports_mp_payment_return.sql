-- ============================================================================
-- SPORTS MODULE — MP payment return confirm (mirrors mark_event_order_paid)
-- ----------------------------------------------------------------------------
-- Optimistic client-side confirm on MP `auto_return=approved` redirect back.
-- The webhook (mp-sports-webhook) remains the authoritative source for the
-- ledger/revenue; this only flips the customer-facing status so the UI
-- doesn't sit on "pending" while waiting for webhook delivery.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_sports_payment_return(
  p_kind        TEXT,   -- 'tournament' | 'rental'
  p_id          UUID,
  p_guest_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_kind = 'tournament' THEN
    UPDATE tournament_teams
      SET entry_payment_status = 'paid',
          payment_method = COALESCE(payment_method, 'mercado_pago'),
          status = CASE WHEN status = 'registered' THEN 'confirmed' ELSE status END,
          updated_at = now()
      WHERE id = p_id AND guest_token = p_guest_token AND entry_payment_status = 'pending';
  ELSIF p_kind = 'rental' THEN
    UPDATE rental_orders
      SET payment_status = 'paid',
          payment_method = COALESCE(payment_method, 'mercado_pago'),
          updated_at = now()
      WHERE id = p_id AND guest_token = p_guest_token AND payment_status = 'pending';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'bad_kind');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_sports_payment_return(TEXT, UUID, TEXT) TO anon, authenticated;
