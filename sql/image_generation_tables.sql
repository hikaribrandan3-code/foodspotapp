-- SQL for FoodSpot AI Image Generation
-- Run this in Supabase SQL Editor

-- Track weekly usage per business (free tier)
CREATE TABLE IF NOT EXISTS image_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, week_start)
);

-- Log all generations for billing/admin
CREATE TABLE IF NOT EXISTS image_generation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    cost_usd DECIMAL(10,4) NOT NULL,
    prompt_preview TEXT,
    duration_ms INTEGER,
    tier TEXT DEFAULT 'free',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to increment usage (atomic)
CREATE OR REPLACE FUNCTION increment_image_usage(
    p_business_id UUID,
    p_week_start DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO image_usage (business_id, week_start, count)
    VALUES (p_business_id, p_week_start, 1)
    ON CONFLICT (business_id, week_start)
    DO UPDATE SET 
        count = image_usage.count + 1,
        updated_at = NOW();
END;
$$;

-- RLS policies
ALTER TABLE image_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON image_usage
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can view own logs" ON image_generation_logs
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Index for fast lookups
CREATE INDEX idx_image_usage_business_week ON image_usage(business_id, week_start);
CREATE INDEX idx_image_logs_business_date ON image_generation_logs(business_id, created_at);
