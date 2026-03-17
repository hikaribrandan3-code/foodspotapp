-- ============================================================================
-- FOODSPOT-OS: Mercado Pago Integration Schema Repair
-- Sandbox Mode - Ghost Transaction Ready
-- ============================================================================

-- ============================================================================
-- PART 1: REPAIR ORDERS TABLE
-- ============================================================================

-- Add Mercado Pago specific columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercado_pago_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mercado_pago_preference_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_response JSONB;

-- Add index for faster lookups by external_reference
CREATE INDEX IF NOT EXISTS idx_orders_external_reference 
ON public.orders(external_reference);

-- Add index for Mercado Pago payment ID lookups
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id 
ON public.orders(mercado_pago_payment_id);

-- Add index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
ON public.orders(payment_status);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.payment_status IS 'Mercado Pago payment status: pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back';
COMMENT ON COLUMN public.orders.external_reference IS 'Unique reference for Mercado Pago integration (order UUID or custom)';
COMMENT ON COLUMN public.orders.mercado_pago_payment_id IS 'Mercado Pago payment transaction ID';
COMMENT ON COLUMN public.orders.mercado_pago_preference_id IS 'Mercado Pago checkout preference ID';

-- ============================================================================
-- PART 2: REPAIR TRANSACTION_LEDGER TABLE
-- ============================================================================

-- Add Mercado Pago specific columns to transaction_ledger
ALTER TABLE public.transaction_ledger 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'payment',
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS mercado_pago_response JSONB,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add index for order lookups
CREATE INDEX IF NOT EXISTS idx_ledger_order_id 
ON public.transaction_ledger(order_id);

-- Add index for external reference
CREATE INDEX IF NOT EXISTS idx_ledger_external_reference 
ON public.transaction_ledger(external_reference);

-- Add index for transaction type
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type 
ON public.transaction_ledger(transaction_type);

-- Add comments
COMMENT ON COLUMN public.transaction_ledger.order_id IS 'Reference to the parent order';
COMMENT ON COLUMN public.transaction_ledger.transaction_type IS 'Type: payment, refund, chargeback, fee';
COMMENT ON COLUMN public.transaction_ledger.external_reference IS 'Mercado Pago external reference for reconciliation';
COMMENT ON COLUMN public.transaction_ledger.mercado_pago_response IS 'Full JSON response from Mercado Pago API';

-- ============================================================================
-- PART 3: CREATE HELPER FUNCTION FOR GHOST TRANSACTION
-- ============================================================================

-- Function to create an order and initial ledger entry atomically
CREATE OR REPLACE FUNCTION public.create_ghost_order(
    p_tenant_id UUID,
    p_item_name TEXT,
    p_amount_cents INTEGER,
    p_external_reference TEXT DEFAULT NULL
)
RETURNS TABLE(order_id UUID, ledger_id UUID) AS $$
DECLARE
    v_order_id UUID;
    v_ledger_id UUID;
    v_external_ref TEXT;
BEGIN
    -- Generate external reference if not provided
    v_external_ref := COALESCE(
        p_external_reference, 
        'GHOST-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT
    );
    
    -- Create the order
    INSERT INTO public.orders (
        tenant_id,
        status,
        payment_status,
        items,
        total_amount_cents,
        currency,
        external_reference,
        table_number
    ) VALUES (
        p_tenant_id,
        'pending',
        'pending',
        jsonb_build_array(
            jsonb_build_object(
                'name', p_item_name,
                'price_cents', p_amount_cents,
                'quantity', 1
            )
        ),
        p_amount_cents,
        'USD',
        v_external_ref,
        1
    )
    RETURNING id INTO v_order_id;
    
    -- Create initial ledger entry
    INSERT INTO public.transaction_ledger (
        order_id,
        transaction_type,
        amount_gross_cents,
        currency,
        external_reference,
        status
    ) VALUES (
        v_order_id,
        'payment',
        p_amount_cents,
        'USD',
        v_external_ref,
        'pending'
    )
    RETURNING id INTO v_ledger_id;
    
    RETURN QUERY SELECT v_order_id, v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark order as paid (for webhook handling)
CREATE OR REPLACE FUNCTION public.mark_order_as_paid(
    p_external_reference TEXT,
    p_mp_payment_id TEXT,
    p_mp_preference_id TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_payment_response JSONB DEFAULT NULL
)
RETURNS TABLE(order_id UUID, success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_id UUID;
    v_ledger_id UUID;
BEGIN
    -- Find and update the order
    UPDATE public.orders
    SET 
        payment_status = 'approved',
        status = 'paid',
        mercado_pago_payment_id = p_mp_payment_id,
        mercado_pago_preference_id = COALESCE(p_mp_preference_id, mercado_pago_preference_id),
        payment_method = p_payment_method,
        paid_at = NOW(),
        payment_response = p_payment_response
    WHERE external_reference = p_external_reference
    RETURNING id INTO v_order_id;
    
    IF v_order_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Order not found for external_reference: ' || p_external_reference;
        RETURN;
    END IF;
    
    -- Update the ledger entry
    UPDATE public.transaction_ledger
    SET 
        status = 'completed',
        mercado_pago_response = p_payment_response,
        payment_method = p_payment_method,
        processed_at = NOW()
    WHERE order_id = v_order_id
    RETURNING id INTO v_ledger_id;
    
    RETURN QUERY SELECT v_order_id, TRUE, 'Order marked as paid. Ledger updated.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

SELECT 'Orders table columns after repair:' AS info;
SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

SELECT 'Transaction ledger columns after repair:' AS info;
SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transaction_ledger'
ORDER BY ordinal_position;