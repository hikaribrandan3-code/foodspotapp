// useTenantSeo — builds per-tenant <head> tags + JSON-LD for the desktop web route.
// Phase 1 SEO: react-helmet-async injects these client-side; Googlebot renders JS
// and indexes them. (Phase 2 = per-request SSR/prerender edge function for dynamic
// tenant slugs — NOT build-time react-snap, which can't see slugs created post-build.)

/**
 * Returns the <head> values for a tenant's desktop page.
 * @param {object} tenantData - from useTenant()
 * @param {string} slug - tenant slug (canonical URL segment)
 * @param {Array}  categories - grouped menu categories (for Menu JSON-LD); optional
 * @returns {{ title, description, image, canonical, restaurantLd, menuLd }}
 */
export function buildTenantSeo(tenantData, slug, categories = []) {
    const name = tenantData?.business_name || 'FoodSpot'
    const cfg = tenantData?.app_config || {}
    const tagline = cfg.tagline || cfg.description || ''
    const cuisine = cfg.cuisine || cfg.servesCuisine || ''
    const image = tenantData?.hero_url || ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const canonical = slug ? `${origin}/${slug}/web` : origin

    const title = `${name} — Menu & Online Ordering`
    const description = tagline
        ? `Order from ${name}. ${tagline}`
        : `Browse the menu and order online from ${name}.${cuisine ? ` ${cuisine}.` : ''}`

    // JSON-LD: Restaurant
    const restaurantLd = {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name,
        url: canonical,
        ...(image ? { image } : {}),
        ...(cuisine ? { servesCuisine: cuisine } : {}),
        ...(cfg.phone ? { telephone: cfg.phone } : {}),
        ...(cfg.address
            ? { address: { '@type': 'PostalAddress', streetAddress: cfg.address } }
            : {}),
    }

    // JSON-LD: Menu (built from grouped categories once data resolves)
    const menuLd = categories.length
        ? {
            '@context': 'https://schema.org',
            '@type': 'Menu',
            name: `${name} Menu`,
            hasMenuSection: categories.map((cat) => ({
                '@type': 'MenuSection',
                name: cat.name,
                hasMenuItem: (cat.items || []).map((it) => ({
                    '@type': 'MenuItem',
                    name: it.name,
                    ...(it.description ? { description: it.description } : {}),
                    offers: {
                        '@type': 'Offer',
                        // price stored as integer minor units → major units string
                        price: ((it.price ?? 0) / 100).toFixed(2),
                        priceCurrency: cfg.businessCurrency || 'ARS',
                    },
                })),
            })),
        }
        : null

    return { title, description, image, canonical, restaurantLd, menuLd }
}
