-- ============================================
-- SUPABASE SAAS INFRASTRUCTURE BLUEPRINT v4.0
-- Target: Multi-Tenant Architecture
-- ============================================

-- 1. PROFILES TABLE (Identity Layer)
-- Links Supabase Auth Users to Business Identity
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'owner', -- 'superadmin', 'owner', 'staff'
    business_id UUID DEFAULT gen_random_uuid(), -- The Tenant ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. BRANDING TABLE (Configuration & Data Layer)
-- Stores everything: Visuals, Config, and the Menu JSON
CREATE TABLE branding (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES profiles(business_id) ON DELETE CASCADE, -- Link to Tenant
    
    -- Visual Identity
    business_name TEXT,
    primary_color TEXT DEFAULT '#8B7355',
    secondary_color TEXT DEFAULT '#F5F0E8',
    logo_url TEXT,
    cover_image_url TEXT,
    
    -- The "Brain": JSONB Columns for SaaS Flexibility
    menu_data JSONB DEFAULT '{}'::jsonb,   -- Stores the entire menuData.js structure
    app_config JSONB DEFAULT '{}'::jsonb,  -- Stores the entire appConfig.v2.js structure
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure 1 Branding Row per Tenant
    CONSTRAINT one_brand_per_tenant UNIQUE (tenant_id)
);

-- Enable RLS for Branding
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can only read/write their OWN branding
CREATE POLICY "Owners manage own branding"
    ON branding
    FOR ALL
    USING (tenant_id IN (
        SELECT business_id FROM profiles WHERE id = auth.uid()
    ));

-- Policy: Public Read (for Customers)
-- Note: In production, you might restrict this to specific domains or use an edge function
CREATE POLICY "Public read branding"
    ON branding
    FOR SELECT
    USING (true);


-- 3. STORAGE INFRASTRUCTURE
-- Bucket: menu-images

-- (Run this in SQL Editor, though normally done via UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Public Read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

-- Storage Policy: Tenant Write Access
-- (Simplified for demo: Authenticated users can upload)
-- In prod: Check if auth.uid() belongs to the tenant owning the path
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'menu-images' );

-- Storage Policy: Tenant Update/Delete
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'menu-images' );

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'menu-images' );
