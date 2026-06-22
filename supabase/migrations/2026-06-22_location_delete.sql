-- ============================================================
-- Location soft delete + updated get_owner_locations
-- Date: 2026-06-22
-- ============================================================

-- 1. Add soft delete column to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Update get_owner_locations to filter out deleted locations
DROP FUNCTION IF EXISTS get_owner_locations();

CREATE OR REPLACE FUNCTION get_owner_locations()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  location_label TEXT,
  address TEXT,
  logo_url TEXT,
  primary_color TEXT,
  is_paused BOOLEAN,
  hours TEXT
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
    COALESCE(br.is_paused, false) AS is_paused,
    b.hours
  FROM businesses b
  LEFT JOIN branding br ON br.business_id = b.id
  WHERE b.owner_id = auth.uid()
    AND b.deleted_at IS NULL
  ORDER BY b.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_owner_locations() TO authenticated;

-- 3. New delete_location RPC — soft delete only
--    Blocks deleting primary (oldest) location
--    Blocks deleting if only 1 location remains
CREATE OR REPLACE FUNCTION delete_location(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id      UUID;
  v_primary_id    UUID;
  v_location_count INT;
BEGIN
  v_owner_id := auth.uid();

  -- Must own this business
  IF NOT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id AND owner_id = v_owner_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get primary (oldest active) location for this owner
  SELECT id INTO v_primary_id
  FROM businesses
  WHERE owner_id = v_owner_id AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  -- Block deleting primary location
  IF p_business_id = v_primary_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete primary location');
  END IF;

  -- Count remaining active locations
  SELECT COUNT(*) INTO v_location_count
  FROM businesses
  WHERE owner_id = v_owner_id AND deleted_at IS NULL;

  IF v_location_count <= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete only location');
  END IF;

  -- Soft delete
  UPDATE businesses SET deleted_at = now() WHERE id = p_business_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_location(UUID) TO authenticated;
