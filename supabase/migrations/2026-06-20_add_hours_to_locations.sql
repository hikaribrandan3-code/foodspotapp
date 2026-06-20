-- Update get_owner_locations RPC to include hours field
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
  ORDER BY b.created_at ASC;
$$;
