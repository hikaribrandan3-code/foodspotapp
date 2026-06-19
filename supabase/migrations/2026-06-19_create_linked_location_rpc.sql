-- ============================================================
-- RPC: create_linked_location
-- Creates a new business + branding row linked to the same owner,
-- then sets parent_slug on BOTH the new and existing businesses.
-- Called from AddLocationModal.jsx
-- ============================================================

CREATE OR REPLACE FUNCTION create_linked_location(
  p_location_name      TEXT,
  p_location_slug      TEXT,
  p_location_label     TEXT    DEFAULT NULL,
  p_location_address   TEXT    DEFAULT NULL,
  p_parent_slug        TEXT    DEFAULT NULL,
  p_parent_brand_name  TEXT    DEFAULT NULL,
  p_parent_brand_logo  TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id   UUID;
  v_new_biz_id UUID;
  v_currency   TEXT;
  v_language   TEXT;
  v_app_config JSONB;
BEGIN
  -- Authenticated owner only
  v_owner_id := auth.uid();
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Slug must be unique
  IF EXISTS (SELECT 1 FROM branding WHERE slug = p_location_slug) THEN
    RAISE EXCEPTION 'Slug already taken: %', p_location_slug;
  END IF;

  -- Inherit currency, language, app_config from owner's first business
  SELECT b.currency, b.language, b.app_config
  INTO v_currency, v_language, v_app_config
  FROM businesses b
  WHERE b.owner_id = v_owner_id
  ORDER BY b.created_at ASC
  LIMIT 1;

  -- Create the new business row
  INSERT INTO businesses (
    owner_id,
    name,
    currency,
    language,
    app_config,
    location_label,
    parent_slug,
    parent_brand_name,
    parent_brand_logo
  )
  VALUES (
    v_owner_id,
    p_location_name,
    COALESCE(v_currency, 'ARS'),
    COALESCE(v_language, 'es'),
    COALESCE(v_app_config, '{}'::JSONB),
    p_location_label,
    p_parent_slug,
    p_parent_brand_name,
    p_parent_brand_logo
  )
  RETURNING id INTO v_new_biz_id;

  -- Create matching branding row
  INSERT INTO branding (
    business_id,
    slug,
    business_name,
    address,
    logo_url
  )
  VALUES (
    v_new_biz_id,
    p_location_slug,
    p_location_name,
    p_location_address,
    p_parent_brand_logo
  );

  -- Link ALL existing businesses for this owner to the same parent_slug
  IF p_parent_slug IS NOT NULL THEN
    UPDATE businesses
    SET
      parent_slug       = p_parent_slug,
      parent_brand_name = COALESCE(p_parent_brand_name, parent_brand_name),
      parent_brand_logo = COALESCE(p_parent_brand_logo, parent_brand_logo)
    WHERE owner_id = v_owner_id
      AND id != v_new_biz_id;
  END IF;

  RETURN json_build_object(
    'business_id', v_new_biz_id,
    'slug', p_location_slug
  );
END;
$$;
