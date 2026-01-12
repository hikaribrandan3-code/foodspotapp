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
-- MIGRATION: ADD NEW COLUMNS FOR WRITE LAYER
-- Run this AFTER the initial schema is in place
-- ============================================

-- Add new columns if they don't exist (idempotent)
ALTER TABLE branding ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS hours TEXT;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS directions TEXT;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';
ALTER TABLE branding ADD COLUMN IF NOT EXISTS font_weight TEXT DEFAULT '400';

-- ============================================
-- SEED DATA: Migrate existing config values
-- Update these values to match your localStorage
-- ============================================

UPDATE branding
SET
    business_name = COALESCE(business_name, 'FoodSpot Café'),
    whatsapp = COALESCE(whatsapp, '+54 11 1234-5678'),
    address = COALESCE(address, 'Av. Corrientes 1234, CABA'),
    hours = COALESCE(hours, 'Lun-Vie 9:00-21:00, Sab 10:00-18:00'),
    font_family = COALESCE(font_family, 'Inter'),
    font_weight = COALESCE(font_weight, '400'),
    updated_at = NOW()
WHERE id = 1;

-- ============================================
-- STORAGE BUCKET SETUP (Run separately in Storage settings)
-- ============================================
-- 1. Create a bucket named 'assets'
-- 2. Set it to PUBLIC (so images are accessible)
-- 3. Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================

