-- ========================================================
-- LANGUAGE SETTINGS TABLE
-- ========================================================

CREATE TABLE IF NOT EXISTS language_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEX for quick lookups
CREATE INDEX IF NOT EXISTS idx_language_settings_business ON language_settings(business_id);

-- RLS: Scoped by business_id header
ALTER TABLE IF EXISTS language_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Language settings read by business" ON language_settings;
CREATE POLICY "Language settings read by business" ON language_settings FOR SELECT
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Language settings update by business" ON language_settings;
CREATE POLICY "Language settings update by business" ON language_settings FOR UPDATE
    USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

DROP POLICY IF EXISTS "Language settings insert by business" ON language_settings;
CREATE POLICY "Language settings insert by business" ON language_settings FOR INSERT
    WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);
