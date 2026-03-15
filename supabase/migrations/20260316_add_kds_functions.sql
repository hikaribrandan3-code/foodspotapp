-- ========================================================
-- ADD KDS STATE MACHINE FUNCTIONS
-- ========================================================

-- Create businesses table if not exists
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff table if not exists
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    email VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    pin VARCHAR(4),
    role VARCHAR(20) NOT NULL DEFAULT 'cook' CHECK (role IN ('admin', 'manager', 'cook', 'runner', 'cashier')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff_shifts table if not exists
CREATE TABLE IF NOT EXISTS staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    shift_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shift_end TIMESTAMPTZ,
    clock_in_lat FLOAT,
    clock_in_lon FLOAT,
    clock_out_lat FLOAT,
    clock_out_lon FLOAT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'missed')),
    total_orders INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    tips NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ledger_entries table if not exists
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    order_id UUID,
    shift_id UUID,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('order', 'payment', 'refund', 'adjustment', 'tip', 'payout')),
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(20),
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_shifts_business ON staff_shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_active ON staff_shifts(status, shift_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ledger_entries_business ON ledger_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_order ON ledger_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_shift ON ledger_entries(shift_id);

-- ========================================================
-- TRANSITION ORDER STATE FUNCTION
-- Uses pg_try_advisory_lock with integer key
-- ========================================================

CREATE OR REPLACE FUNCTION transition_order_state(
    p_order_id UUID,
    p_new_status VARCHAR,
    p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    old_status VARCHAR,
    new_status VARCHAR
) AS $$
DECLARE
    v_current_status VARCHAR;
    v_business_id UUID;
    v_lock_key BIGINT;
    v_allowed_transitions TEXT[] := ARRAY[
        'pending->paid', 'pending->cancelled',
        'paid->cooking', 'paid->cancelled',
        'cooking->ready', 'cooking->cancelled',
        'ready->delivered',
        'delivered->refunded',
        'cancelled->pending'
    ];
    v_transition VARCHAR;
    v_is_allowed BOOLEAN := FALSE;
    v_order RECORD;
BEGIN
    -- Generate integer lock key from UUID
    v_lock_key := ('x' || substr(p_order_id::text, 1, 8))::bit(32)::bigint;
    
    -- Acquire advisory lock (non-blocking)
    IF NOT pg_try_advisory_lock(1, v_lock_key) THEN
        RETURN QUERY SELECT FALSE, 'Order is being processed by another user', NULL, NULL;
        RETURN;
    END IF;

    -- Get current order state
    SELECT id, status, business_id INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        PERFORM pg_advisory_unlock(1, v_lock_key);
        RETURN QUERY SELECT FALSE, 'Order not found', NULL, NULL;
        RETURN;
    END IF;

    v_current_status := v_order.status;
    v_business_id := v_order.business_id;
    v_transition := v_current_status || '->' || p_new_status;

    -- Validate transition
    IF v_transition = ANY(v_allowed_transitions) THEN
        v_is_allowed := TRUE;
    END IF;

    IF NOT v_is_allowed THEN
        PERFORM pg_advisory_unlock(1, v_lock_key);
        RETURN QUERY SELECT FALSE, 
            'Invalid transition: ' || v_current_status || ' -> ' || p_new_status,
            v_current_status,
            p_new_status;
        RETURN;
    END IF;

    -- Execute transition
    UPDATE orders
    SET 
        status = p_new_status,
        updated_at = NOW(),
        assigned_to = COALESCE(assigned_to, p_staff_id),
        started_at = CASE WHEN p_new_status = 'cooking' AND started_at IS NULL THEN NOW() ELSE started_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
    WHERE id = p_order_id;

    -- Update shift stats if staff involved
    IF p_staff_id IS NOT NULL AND p_new_status IN ('cooking', 'ready', 'delivered') THEN
        UPDATE staff_shifts
        SET total_orders = total_orders + 1
        WHERE staff_id = p_staff_id 
        AND status = 'active'
        AND shift_end IS NULL;
    END IF;

    -- Release lock
    PERFORM pg_advisory_unlock(1, v_lock_key);

    RETURN QUERY SELECT TRUE, 'State transition successful', v_current_status, p_new_status;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- CLOCK IN/OUT FUNCTIONS
-- ========================================================

CREATE OR REPLACE FUNCTION clock_in(p_business_id UUID, p_staff_id UUID, p_lat FLOAT, p_lon FLOAT)
RETURNS UUID AS $$
DECLARE
    v_shift_id UUID;
BEGIN
    -- Close any open shifts first
    UPDATE staff_shifts
    SET shift_end = NOW(), status = 'closed', updated_at = NOW()
    WHERE staff_id = p_staff_id AND status = 'active' AND shift_end IS NULL;

    -- Create new shift
    INSERT INTO staff_shifts (business_id, staff_id, shift_start, clock_in_lat, clock_in_lon, status)
    VALUES (p_business_id, p_staff_id, NOW(), p_lat, p_lon, 'active')
    RETURNING id INTO v_shift_id;

    RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clock_out(p_shift_id UUID, p_lat FLOAT, p_lon FLOAT)
RETURNS VOID AS $$
BEGIN
    UPDATE staff_shifts
    SET shift_end = NOW(),
        status = 'closed',
        clock_out_lat = p_lat,
        clock_out_lon = p_lon,
        updated_at = NOW()
    WHERE id = p_shift_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- RLS POLICIES
-- ========================================================

ALTER TABLE IF EXISTS businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ledger_entries ENABLE ROW LEVEL SECURITY;

-- Staff: Business-scoped
DROP POLICY IF EXISTS "Staff read by business" ON staff;
CREATE POLICY "Staff read by business" ON staff FOR SELECT
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Staff insert by business" ON staff;
CREATE POLICY "Staff insert by business" ON staff FOR INSERT
    WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Staff update by business" ON staff;
CREATE POLICY "Staff update by business" ON staff FOR UPDATE
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- Staff Shifts: Staff see their own shifts only
DROP POLICY IF EXISTS "Staff see own shifts" ON staff_shifts;
CREATE POLICY "Staff see own shifts" ON staff_shifts FOR SELECT
    USING (
        business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
        OR staff_id = (current_setting('request.headers', true)::json->>'x-staff-id')::uuid
    );

DROP POLICY IF EXISTS "Staff insert own shifts" ON staff_shifts;
CREATE POLICY "Staff insert own shifts" ON staff_shifts FOR INSERT
    WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Staff update own shifts" ON staff_shifts;
CREATE POLICY "Staff update own shifts" ON staff_shifts FOR UPDATE
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- Ledger Entries: Business-scoped
DROP POLICY IF EXISTS "Ledger read by business" ON ledger_entries;
CREATE POLICY "Ledger read by business" ON ledger_entries FOR SELECT
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Ledger insert by business" ON ledger_entries;
CREATE POLICY "Ledger insert by business" ON ledger_entries FOR INSERT
    WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Ledger update by business" ON ledger_entries;
CREATE POLICY "Ledger update by business" ON ledger_entries FOR UPDATE
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);