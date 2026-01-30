/**
 * configNormalizer.js
 * 
 * 🛠️ THE BRIDGE: Maps Flat Database Columns -> Nested UI Objects
 * 
 * This utility standardizes how we hydrate the UI from Supabase data.
 * It resolves the "Ghost Hero" and "Missing Logo" issues by explicitly
 * mapping the root branding columns to the AppHeader configuration.
 * 
 * Used by: Home.jsx, Menu.jsx, App.jsx
 */

import { defaultConfig } from '../config/appConfig.v2.js'

/**
 * Normalizes tenant data into a structure the UI components expect.
 * 
 * @param {Object} baseConfig - The initial config (usually from props or defaults)
 * @param {Object} tenantData - The raw row from the 'branding' table
 * @returns {Object} Only the fields that need overrides/merging
 */
export function normalizeTenantConfig(baseConfig, tenantData) {
    if (!tenantData) return { ...defaultConfig, ...baseConfig }

    // 1. EXTRACT RAW VALUES (Handle both camelCase props and snake_case DB columns)
    // We prioritize tenantData (DB) > baseConfig (Props) > defaultConfig

    // Identity
    const businessName = tenantData.business_name || baseConfig?.businessName || defaultConfig.businessName
    const logoUrl = tenantData.logo_url || baseConfig?.logo || defaultConfig.logo

    // Hero / Cover
    const heroUrl = tenantData.hero_url || tenantData.app_config?.headerCover?.image || baseConfig?.headerCover?.image
    const dbHeroMode = tenantData.hero_mode // 'text', 'cover', etc.

    // Typography
    const fontFamily = tenantData.font_family || baseConfig?.branding?.fontFamily
    const fontWeight = tenantData.font_weight || '800' // Default to ExtraBold for brands

    // 2. CALCULATE DERIVED MODES & PARSE URL PARAMS
    let heroScale = 1
    let heroOffsetX = 0
    let heroOffsetY = 0

    if (heroUrl) {
        try {
            const urlObj = new URL(heroUrl)
            const params = new URLSearchParams(urlObj.search)
            if (params.has('s')) heroScale = parseFloat(params.get('s'))
            if (params.has('x')) heroOffsetX = parseFloat(params.get('x'))
            if (params.has('y')) heroOffsetY = parseFloat(params.get('y'))
        } catch (e) {
            // Invalid URL, ignore params
        }
    }

    // "Ghost Hero" Fix: If no image exists, FORCE 'text' mode.
    // This collapses the 220px/280px cover into a smaller text header.
    const isTextMode = dbHeroMode === 'text' || !heroUrl
    const finalHeaderMode = isTextMode ? 'text' : 'cover'

    // 3. CONSTRUCT THE NORMALIZED CONFIG
    return {
        ...defaultConfig,
        ...baseConfig,
        ...tenantData, // Spread root data (careful not to break structure)

        // Identity Overrides
        businessName,
        logo: logoUrl,
        logoLight: logoUrl, // Force same logo for both modes if only one exists
        logoDark: logoUrl,

        // Canvas Mode
        canvasMode: tenantData.canvas_mode || baseConfig?.canvasMode || 'light',

        // Header Structure (The Critical Fix)
        headerBranding: {
            mode: finalHeaderMode
        },

        headerCover: {
            ...(baseConfig?.headerCover || defaultConfig.headerCover || {}),

            // Content
            title: businessName,
            image: heroUrl,
            scale: heroScale,
            offsetX: heroOffsetX,
            offsetY: heroOffsetY,

            // Logic
            useImage: !isTextMode,
            showTitle: true,
            useLogo: !!logoUrl,

            // Visual Overrides (The "Gucci" Look)
            fontFamily,
            fontWeight,

            // Dynamic Styles based on Mode
            titleStyle: {
                fontSize: isTextMode ? 'clamp(32px, 8vw, 48px)' : '24px',
                textTransform: 'uppercase',
                letterSpacing: '-0.03em',
                textAlign: 'center',
                lineHeight: '0.95',
                width: '100%',
                color: '#000000',
                textShadow: 'none'
            },

            containerStyle: {
                minHeight: isTextMode ? '260px' : '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                backgroundColor: 'var(--canvas-bg)'
            }
        },

        // Deep Merge Objects (ensure snake_case DB fields map to camelCase)
        heroIcons: tenantData.hero_icons ||
            baseConfig?.heroIcons ||
            defaultConfig.heroIcons,

        featuredPhotos: tenantData.featured_photos ||
            baseConfig?.featuredPhotos ||
            defaultConfig.featuredPhotos,

        homeConfig: tenantData.home_config ||
            baseConfig?.homeConfig ||
            defaultConfig.homeConfig,

        // Branding Colors (The Big 4)
        colors: {
            ...(baseConfig?.colors || defaultConfig.colors),
            primary: tenantData.primary_color,
            secondary: tenantData.secondary_color,
            confirmation: tenantData.confirmation_color,
            powered: tenantData.powered_by_color
        }
    }
}
