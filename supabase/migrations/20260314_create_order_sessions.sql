-- Create order_sessions table for shared ordering sessions
CREATE TABLE IF NOT EXISTS order_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    share_code VARCHAR(6) NOT NULL,
    table_number VARCHAR(20),
    session_name VARCHAR(100),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
    items JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_order_sessions_business ON order_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_order_sessions_share_code ON order_sessions(share_code);
CREATE INDEX IF NOT EXISTS idx_order_sessions_status_expires ON order_sessions(status, expires_at) WHERE status = 'active';

-- RLS Policies
ALTER TABLE order_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active sessions (for joining)
CREATE POLICY "Allow read active sessions"
    ON order_sessions FOR SELECT
    USING (status = 'active' AND expires_at > NOW());

-- Allow business owners full access via x-business-id header
CREATE POLICY "Owners can manage sessions"
    ON order_sessions FOR ALL
    USING (
        business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    );

-- Allow guests to create sessions for their business
CREATE POLICY "Guests can create sessions"
    ON order_sessions FOR INSERT
    WITH CHECK (true);

-- Allow participants to update their session
CREATE POLICY "Participants can update session"
    ON order_sessions FOR UPDATE
    USING (true);