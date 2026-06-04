/**
 * 20260604_create_tenant_config_view.sql
 *
 * STATUS: Optional architecture reference - currently not used by app
 *
 * This migration creates the tenant_config view as originally intended in commit
 * 682a995e. The view joins businesses + branding tables to provide a single query
 * for boot-time tenant configuration (language, branding colors, service modes, etc.).
 *
 * NOTE: TenantContext currently fetches directly from the branding table (with
 * language from businesses table) rather than using this view. The view is created
 * here as a reference architecture for future refactoring.
 *
 * Future work: Migrate TenantContext back to use this view once it's properly
 * indexed in the database and RLS policies are verified.
 */

-- Create tenant_config view (safe to re-create)
-- This view joins the businesses table with the branding table
CREATE OR REPLACE VIEW public.tenant_config AS
SELECT
    -- Businesses table columns (identity + language)
    b.id AS business_id,
    b.slug,
    b.language,

    -- Branding table columns (full branding config)
    br.business_name,
    br.font_family,
    br.font_weight,
    br.navbar_color,
    br.confirmation_color,
    br.powered_by_color,
    br.hero_mode,
    br.hero_url,
    br.hero_cover_image,
    br.hero_cover_image_uploaded_at,
    br.nav_icon_mode,
    br.hero_icon_mode,
    br.hero_icons,
    br.info_pills,
    br.is_paused,
    br.pause_message,

    -- Service modes (flat columns for post-migration schema)
    br.pickup_enabled,
    br.delivery_enabled,
    br.dine_in_enabled,
    br.dine_in_payment_timing,

    -- Delivery configuration
    br.delivery_radius,
    br.delivery_radius_km,
    br.delivery_fee,
    br.free_delivery_threshold,
    br.store_lat,
    br.store_lon,

    -- App configuration (JSONB for extensible settings)
    br.app_config,

    -- Menu data (JSONB)
    br.menu_data,

    -- Timestamps
    br.updated_at
FROM public.businesses b
LEFT JOIN public.branding br ON b.id = br.business_id
WHERE b.is_deleted = false;

COMMENT ON VIEW public.tenant_config IS 'Reference architecture for boot-time tenant config (businesses + branding joined). Currently not used - see TenantContext for actual query pattern.';
