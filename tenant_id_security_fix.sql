-- ============================================================================
-- FOODSPOT: TENANT_ID ISOLATION SECURITY FIX
-- Date: 2026-04-07
-- Issue: Orders table lacks proper tenant isolation — cross-tenant data leak possible
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFY CURRENT STATE (Run first to see the problem)
-- ============================================================================

-- Check if orders table has tenant_id or business_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders' 
ORDER BY ordinal_position;

-- Check current RLS policies on orders
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- ============================================================================
-- PART 2: ADD BUSINESS_ID IF MISSING (Critical for isolation)
-- ============================================================================

-- Add business_id column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add tenant_id as alias for business_id (for compatibility)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);

-- ============================================================================
-- PART 3: MIGRATE EXISTING DATA (If business_id is null)
-- ============================================================================

-- If you have orders without business_id, you need to map them
-- This assumes you have a way to identify which business each order belongs to
-- Update this query based on your actual data structure

-- OPTION A: If orders can be mapped via staff or session
-- UPDATE public.orders o
-- SET business_id = s.business_id
-- FROM public.staff_shifts s
-- WHERE o.staff_id = s.staff_id
-- AND o.business_id IS NULL;

-- OPTION B: If orders should be manually assigned (safer for production)
-- You'll need to run this per business during migration

-- ============================================================================
-- PART 4: ENFORCE TENANT ISOLATION (Critical RLS Policies)
-- ============================================================================

-- Enable RLS on orders if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Orders are viewable by business" ON public.orders;
DROP POLICY IF EXISTS "Orders are insertable by business" ON public.orders;
DROP POLICY IF EXISTS "Orders are updatable by business" ON public.orders;
DROP POLICY IF EXISTS "Orders are deletable by business" ON public.orders;

-- Policy 1: Users can only see orders from their business
CREATE POLICY "Orders are viewable by business" ON public.orders
    FOR SELECT
    USING (
        business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
        OR business_id = (current_setting('request.headers', true)::json->>'x-tenant-id')::uuid
        OR EXISTS (
            SELECT 1 FROM public.businesses b 
            WHERE b.id = orders.business_id 
            AND b.slug = current_setting('request.headers', true)::json->>'x-tenant-slug'
        )
    );

-- Policy 2: Users can only insert orders for their business
CREATE POLICY "Orders are insertable by business" ON public.orders
    FOR INSERT
    WITH CHECK (
        business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
        OR business_id = (current_setting('request.headers', true)::json->>'x-tenant-id')::uuid
    );

-- Policy 3: Users can only update orders from their business
CREATE POLICY "Orders are updatable by business" ON public.orders
    FOR UPDATE
    USING (
        business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
        OR business_id = (current_setting('request.headers', true)::json->>'x-tenant-id')::uuid
    );

-- Policy 4: Users can only delete orders from their business
CREATE POLICY "Orders are deletable by business" ON public.orders
    FOR DELETE
    USING (
        business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
        OR business_id = (current_setting('request.headers', true)::json->>'x-tenant-id')::uuid
    );

-- ============================================================================
-- PART 5: VERIFY ISOLATION (Test queries)
-- ============================================================================

-- Test: Set tenant context and verify only that tenant's orders appear
-- This simulates what happens in your app

-- Set the tenant context (as your app would do)
-- SET request.headers = '{"x-business-id": "your-business-uuid-here"}';

-- Then query should ONLY return orders for that business
-- SELECT * FROM public.orders; -- Should be filtered by RLS

-- ============================================================================
-- PART 6: FORCE BUSINESS_ID ON ALL NEW ORDERS (Trigger)
-- ============================================================================

-- Create trigger to ensure business_id is always set
CREATE OR REPLACE FUNCTION enforce_tenant_isolation()
RETURNS TRIGGER AS $$
DECLARE
    v_business_id UUID;
BEGIN
    -- If business_id not provided, try to get it from context
    IF NEW.business_id IS NULL THEN
        BEGIN
            v_business_id := (current_setting('request.headers', true)::json->>'x-business-id')::uuid;
            IF v_business_id IS NULL THEN
                v_business_id := (current_setting('request.headers', true)::json->>'x-tenant-id')::uuid;
            END IF;
            NEW.business_id := v_business_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'business_id is required and cannot be determined from context';
        END;
    END IF;
    
    -- Sync tenant_id with business_id
    NEW.tenant_id := NEW.business_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to orders
DROP TRIGGER IF EXISTS enforce_tenant_isolation_trigger ON public.orders;
CREATE TRIGGER enforce_tenant_isolation_trigger
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION enforce_tenant_isolation();

-- ============================================================================
-- PART 7: VERIFICATION
-- ============================================================================

SELECT 'Orders table columns after fix:' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
AND column_name IN ('id', 'business_id', 'tenant_id', 'status', 'created_at')
ORDER BY ordinal_position;

SELECT 'RLS Policies on orders:' AS info;
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'orders';

SELECT 'Trigger verification:' AS info;
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'orders';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (If something goes wrong)
-- ============================================================================
-- DROP POLICY IF EXISTS "Orders are viewable by business" ON public.orders;
-- DROP POLICY IF EXISTS "Orders are insertable by business" ON public.orders;
-- DROP POLICY IF EXISTS "Orders are updatable by business" ON public.orders;
-- DROP POLICY IF EXISTS "Orders are deletable by business" ON public.orders;
-- DROP TRIGGER IF EXISTS enforce_tenant_isolation_trigger ON public.orders;
-- DROP FUNCTION IF EXISTS enforce_tenant_isolation();
-- ============================================================================
