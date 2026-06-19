-- ============================================================
-- Multi-Location Hub: Schema + RPCs
-- Enables restaurant groups with 2+ locations under one owner
-- ============================================================

-- 1. New columns on businesses for parent brand grouping
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS location_label TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_brand_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_brand_logo TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_slug TEXT;

-- Index for fast parent_slug lookups (customer hub page)
CREATE INDEX IF NOT EXISTS idx_businesses_parent_slug ON businesses(parent_slug) WHERE parent_slug IS NOT NULL;

-- 2. RPC: get_owner_locations — all locations for the authenticated owner
CREATE OR REPLACE FUNCTION get_owner_locations()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  location_label TEXT,
  address TEXT,
  logo_url TEXT,
  primary_color TEXT,
  is_paused BOOLEAN
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    br.slug,
    COALESCE(br.business_name, b.name) AS name,
    b.location_label,
    br.address,
    br.logo_url,
    br.navbar_color AS primary_color,
    COALESCE(br.is_paused, false) AS is_paused
  FROM businesses b
  LEFT JOIN branding br ON br.business_id = b.id
  WHERE b.owner_id = auth.uid()
  ORDER BY b.created_at ASC;
$$;

-- 3. RPC: get_locations_by_parent_slug — public, for customer hub page
CREATE OR REPLACE FUNCTION get_locations_by_parent_slug(p_parent_slug TEXT)
RETURNS TABLE (
  slug TEXT,
  name TEXT,
  location_label TEXT,
  address TEXT,
  logo_url TEXT,
  primary_color TEXT,
  is_paused BOOLEAN,
  parent_brand_name TEXT,
  parent_brand_logo TEXT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    br.slug,
    COALESCE(br.business_name, b.name) AS name,
    b.location_label,
    br.address,
    br.logo_url,
    br.navbar_color AS primary_color,
    COALESCE(br.is_paused, false) AS is_paused,
    b.parent_brand_name,
    b.parent_brand_logo
  FROM businesses b
  LEFT JOIN branding br ON br.business_id = b.id
  WHERE b.parent_slug = p_parent_slug
  ORDER BY b.created_at ASC;
$$;

-- 4. RPC: get_combined_stats — owner's combined revenue across all locations
CREATE OR REPLACE FUNCTION get_combined_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  business_id UUID,
  slug TEXT,
  name TEXT,
  total_orders BIGINT,
  total_revenue_cents BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id AS business_id,
    br.slug,
    COALESCE(br.business_name, b.name) AS name,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.total), 0) AS total_revenue_cents
  FROM businesses b
  LEFT JOIN branding br ON br.business_id = b.id
  LEFT JOIN orders o ON o.business_id = b.id
    AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND o.status NOT IN ('cancelled', 'refunded')
  WHERE b.owner_id = auth.uid()
  GROUP BY b.id, br.slug, br.business_name, b.name
  ORDER BY b.created_at ASC;
$$;
