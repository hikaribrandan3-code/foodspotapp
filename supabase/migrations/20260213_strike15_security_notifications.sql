-- ============================================
-- 💰 STRIKE 15: P0 SECURITY + NOTIFICATIONS
-- ============================================
-- 1. Unique constraint on payment_id (idempotency)
-- 2. Add mp_preference_id column
-- 3. Add cancel_reason column
-- 4. Create owner_notifications table
-- 5. Create escalation function + trigger
-- ============================================

-- 1. IDEMPOTENCY: Ensure payment_id is unique (prevents duplicate webhook processing)
-- Using a partial unique index since payment_id can be NULL for cash orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id_unique 
ON public.orders (payment_id) 
WHERE payment_id IS NOT NULL;

-- 2. Store MP preference ID on orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 3. OWNER NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.owner_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    message TEXT NOT NULL,
    type TEXT DEFAULT 'alert',  -- 'alert', 'escalation', 'info'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Owners can only see their notifications
ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners see own notifications"
ON public.owner_notifications FOR SELECT
USING (business_id IN (
    SELECT business_id FROM public.branding
    WHERE owner_id = auth.uid()
));

CREATE POLICY "System can insert notifications"
ON public.owner_notifications FOR INSERT
WITH CHECK (true);

-- 4. ESCALATION FUNCTION
-- Fires when an order has been in 'awaiting_payment' or 'paid_unreleased' for >5 minutes
-- without being acknowledged by the owner
CREATE OR REPLACE FUNCTION check_stalled_orders()
RETURNS void AS $$
BEGIN
    -- Insert notifications for orders stuck in payment states for >5 minutes
    INSERT INTO public.owner_notifications (business_id, order_id, message, type)
    SELECT 
        o.business_id,
        o.id,
        '🚨 Pedido #' || o.order_number || ' lleva más de 5 minutos sin confirmar. ¡Revísalo!',
        'escalation'
    FROM public.orders o
    WHERE o.status IN ('awaiting_payment', 'pendiente_confirmacion')
      AND o.created_at < now() - INTERVAL '5 minutes'
      AND NOT EXISTS (
          SELECT 1 FROM public.owner_notifications n
          WHERE n.order_id = o.id AND n.type = 'escalation'
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Schedule with pg_cron (run every 2 minutes)
-- NOTE: pg_cron must be enabled in Supabase Dashboard > Database > Extensions
-- SELECT cron.schedule('check-stalled-orders', '*/2 * * * *', 'SELECT check_stalled_orders()');

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
