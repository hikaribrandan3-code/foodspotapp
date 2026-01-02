-- ============================================
-- SUPABASE SQL SCHEMA: BRANDING TABLE
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Create the branding table
CREATE TABLE branding (
    id BIGINT PRIMARY KEY DEFAULT 1,
    logo_url TEXT,
    hero_url TEXT,
    primary_color TEXT DEFAULT '#DB0007',
    secondary_color TEXT DEFAULT '#FFC72C',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one row exists (singleton pattern)
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Enable Row Level Security
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- PUBLIC READ: Anyone can read branding (for Google App)
CREATE POLICY "Public read access"
    ON branding
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- AUTHENTICATED UPDATE: Only logged-in users can update
CREATE POLICY "Authenticated update access"
    ON branding
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- AUTHENTICATED INSERT: Allow initial insert
CREATE POLICY "Authenticated insert access"
    ON branding
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. Insert the default row
INSERT INTO branding (id, primary_color, secondary_color)
VALUES (1, '#DB0007', '#FFC72C')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE BUCKET SETUP (Run separately in Storage settings)
-- ============================================
-- 1. Create a bucket named 'branding'
-- 2. Set it to PUBLIC (so images are accessible)
-- 3. Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================
