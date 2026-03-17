-- ============================================================================
-- FOODSPOT-OS: CRITICAL SCHEMA REPAIRS FOR MERCADO PAGO INTEGRATION
-- Found: orders_status_check constraint is broken - only allows 'cancelled'
-- ============================================================================

-- ============================================================================
-- PART 1: FIX THE BROKEN ORDERS STATUS CONSTRAINT
-- ============================================================================

-- First, drop the broken constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add a proper constraint that supports the full order lifecycle
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled', 'refunded'));

-- Set a sensible default
ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================================================
-- PART 2: ADD MERCADO PAGO COLUMNS (if not already present)
-- ============================================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercado_pago_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mercado_pago_preference_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_response JSONB;

ALTER TABLE public.transaction_ledger 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'payment',
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercado_pago_response JSONB,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_external_reference ON public.orders(external_reference);
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON public.orders(mercado_pago_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_ledger_order_id ON public.transaction_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_external_reference ON public.transaction_ledger(external_reference);

-- ============================================================================
-- PART 4: CREATE WEBHOOK HANDLER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_mercado_pago_webhook(
    p_external_reference TEXT,
    p_mp_payment_id TEXT,
    p_status TEXT,
    p_payment_method TEXT DEFAULT NULL,
    p_mp_response JSONB DEFAULT NULL
)
RETURNS TABLE(order_id UUID, success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_id UUID;
    v_current_status TEXT;
BEGIN
    -- Find the order
    SELECT id, status INTO v_order_id, v_current_status
    FROM public.orders
    WHERE external_reference = p_external_reference;
    
    IF v_order_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Order not found: ' || p_external_reference;
        RETURN;
    END IF;
    
    -- Only process if not already paid
    IF v_current_status = 'paid' THEN
        RETURN QUERY SELECT v_order_id, TRUE, 'Order already marked as paid';
        RETURN;
    END IF;
    
    -- Update order based on Mercado Pago status
    IF p_status IN ('approved', 'authorized') THEN
        UPDATE public.orders
        SET 
            status = 'paid',
            payment_status = p_status,
            mercado_pago_payment_id = p_mp_payment_id,
            payment_method = p_payment_method,
            paid_at = NOW(),
            payment_response = p_mp_response
        WHERE id = v_order_id;
        
        -- Update ledger
        UPDATE public.transaction_ledger
        SET 
            status = 'completed',
            mercado_pago_response = p_mp_response,
            payment_method = p_payment_method,
            processed_at = NOW()
        WHERE order_id = v_order_id;
        
        RETURN QUERY SELECT v_order_id, TRUE, 'Payment approved and order marked as paid';
        
    ELSIF p_status IN ('in_process', 'pending') THEN
        UPDATE public.orders
        SET payment_status = p_status
        WHERE id = v_order_id;
        
        RETURN QUERY SELECT v_order_id, TRUE, 'Payment pending/in_process';
        
    ELSIF p_status IN ('rejected', 'cancelled', 'refunded', 'charged_back') THEN
        UPDATE public.orders
        SET payment_status = p_status
        WHERE id = v_order_id;
        
        UPDATE public.transaction_ledger
        SET status = CASE 
            WHEN p_status = 'refunded' THEN 'refunded'
            WHEN p_status = 'charged_back' THEN 'charged_back'
            ELSE 'failed'
        END
        WHERE order_id = v_order_id;
        
        RETURN QUERY SELECT v_order_id, TRUE, 'Payment ' || p_status;
    ELSE
        RETURN QUERY SELECT v_order_id, TRUE, 'Unknown status: ' || p_status;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Orders table constraints:' AS info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass AND contype = 'c';

SELECT 'Orders table columns:' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;