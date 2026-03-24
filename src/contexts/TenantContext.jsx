/**
 * TenantContext.jsx - Strike 2: Tenant Lock
 * 
 * 🏢 Multi-Tenant Identity Provider (Strict Mode)
 * Reference: Antigravity Protocol Phase 3
 * 
 * 🛡️ Features:
 * - Strict Slug Resolution
 * - System Route Fallback (Persistence)
 * - Global Refresh Support
 * - venue_name Schema Alignment
 * - 🚀 Image Pre-fetching for Optimized Loading
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// 🚀 VAULT-SEAL: Low-priority image pre-fetcher
// Prefetches images so they're ready before user clicks the tab
const prefetchImages = (urls) => {
    if (!urls || urls.length === 0) return
    
    // Use requestIdleCallback for low-priority fetching, fallback to setTimeout
    const schedulePrefetch = window.requestIdleCallback || ((cb) => setTimeout(cb, 1))
    
    schedulePrefetch(() => {
        urls.forEach(url => {
            if (!url || url.startsWith('blob:')) return
            const img = new Image()
            img.fetchPriority = 'low'
            img.decoding = 'async'
            img.src = url
        })
    }, { timeout: 2000 })
}

// Extract image URLs to prefetch from tenant data
// 🛡️ MOBILE-CONSTRAINED: Only hero + top 5 featured items (prevents network saturation)
const extractPrefetchUrls = (brandingData) => {
    const urls = []
    
    // 1. Hero/Banner image (PRIORITY)
    if (brandingData?.hero_url) {
        urls.push(brandingData.hero_url)
    }
    
    // 2. Top 5 featured menu items ONLY (no category items to prevent mobile network saturation)
    const featuredPhotos = brandingData?.app_config?.featuredPhotos || brandingData?.featured_photos || []
    featuredPhotos.slice(0, 5).forEach(photo => {
        if (photo?.image && !photo.image.startsWith('blob:')) {
            urls.push(photo.image)
        }
    })
    
    // 🚫 REMOVED: Category item prefetching to prevent mobile network saturation
    // Previously fetched 5 items per category - now limited to hero + 5 featured max
    
    return urls.slice(0, 6) // Max 6 images (1 hero + 5 featured)
}

// Context Definition
const TenantContext = createContext(null)

// 🚫 SYSTEM ROUTES (Reserved Slugs)
const SYSTEM_ROUTES = [
    'admin', 'owner', 'login', 'signup', 'start-trial',
    'status', 'checkout', 'order'
]

export function TenantProvider({ children }) {
    // 🛡️ STATE
    const [tenantData, setTenantData] = useState(null)
    const [businessId, setBusinessId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Compatibility State
    const [trialExpired, setTrialExpired] = useState(false)
    const [emergencyUnblock, setEmergencyUnblock] = useState(false)
    const [forceRefresh, setForceRefresh] = useState(0)

    // Helper: Identify if current path segment is a tenant slug
    const getTargetSlug = () => {
        const pathSegments = window.location.pathname.split('/').filter(Boolean)
        const possibleSlug = pathSegments[0]

        if (!possibleSlug || SYSTEM_ROUTES.includes(possibleSlug)) {
            const lastActive = localStorage.getItem('fs_last_active_slug')
            if (lastActive) {
                console.log(`[TenantLock] 🔌 Recovered identity for system route '/${possibleSlug}': ${lastActive}`)
                return lastActive
            }
            return null
        }
        return possibleSlug
    }

    // 🛡️ RESOLUTION ENGINE
    useEffect(() => {
        let mounted = true

        const resolveIdentity = async () => {
            try {
                const targetSlug = getTargetSlug()

                if (!targetSlug) {
                    console.warn('[TenantLock] ⚠️ No Identity Found. Waiting for injection or manual slug.')
                    setLoading(false)
                    return
                }

                console.log(`[TenantLock] 🔐 Locking Tenant: ${targetSlug}`)

                // ⚡ CACHE-FIRST STRATEGY (Optimization)
                const CACHE_KEY = `tenant_lock_${targetSlug}`
                const cached = localStorage.getItem(CACHE_KEY)

                if (cached) {
                    const parsed = JSON.parse(cached)
                    setTenantData(parsed)
                    setBusinessId(parsed.business_id)
                    setTenantStoragePrefix(parsed.business_id)

                    if (parsed.language) {
                        console.log(`[TenantLock] ⚡ HYDRATED from cache with language: ${parsed.language}`)
                        setLoading(false)
                    } else {
                        console.warn('[TenantLock] ⚠️ Legacy cache missing language. Waiting for revalidation...')
                    }

                    setTimeout(() => revalidate(targetSlug), 100)
                } else {
                    console.log('[TenantLock] 📡 First Boot: Waiting for revalidate...')
                    await revalidate(targetSlug)
                }

            } catch (err) {
                console.error('[TenantLock] 💥 Critical Failure:', err)
                if (mounted) setError(err.message)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        const revalidate = async (slug) => {
            const { data: brandingData, error: brandingError } = await supabase
                .from('branding')
                .select('*')
                .eq('slug', slug)
                .single()

            if (brandingError) throw brandingError

            if (brandingData) {
                // 📡 DOUBLE-FETCH: Get language from tenants table using venue_name (Official Schema)
                // 🛡️ UNIVERSAL CASE FIX: Use .ilike() for case-insensitive matching
                let { data: tenantRow, error: langError } = await supabase
                    .from('tenants')
                    .select('id, language, venue_name, owner_id')
                    .ilike('venue_name', slug)
                    .single()

                // 🆘 ULTIMATE FAILSAFE: If venue_name fails, fetch by authenticated owner ID
                if ((langError || !tenantRow) && mounted) {
                    console.log(`[TenantLock] 🆘 Venue Lookup Failed (${slug}). Trying Owner Failsafe...`);
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: ownerRow, error: ownerError } = await supabase
                            .from('tenants')
                            .select('id, language, venue_name, owner_id')
                            .eq('owner_id', user.id)
                            .single();

                        if (!ownerError && ownerRow) {
                            console.log(`[TenantLock] ✅ Failsafe Success: Identity secured via owner_id.`);
                            tenantRow = ownerRow;
                            langError = null;
                        }
                    }
                }

                if (langError) {
                    console.error("SUPABASE ERROR (Tenants Fetch):", langError.message, langError.details);
                }

                // MERGE: Ensure we keep the actual tenant PK (id) and venue_name
                const data = { ...brandingData, id: tenantRow?.id, venue_name: tenantRow?.venue_name, language: tenantRow?.language || 'es' }

                if (mounted) {
                    setTenantData(data)
                    setBusinessId(data.business_id)
                    setTenantStoragePrefix(data.business_id)
                    setTrialExpired(false)
                    
                    // 🚀 VAULT-SEAL: Pre-fetch critical images in background
                    const prefetchUrls = extractPrefetchUrls(data)
                    if (prefetchUrls.length > 0) {
                        console.log(`[TenantLock] 🚀 Pre-fetching ${prefetchUrls.length} images...`)
                        prefetchImages(prefetchUrls)
                    }
                }

                // UPDATE PERSISTENCE
                const CACHE_KEY = `tenant_lock_${slug}`
                localStorage.setItem(CACHE_KEY, JSON.stringify(data))
                localStorage.setItem('fs_last_active_slug', slug)

                applyTheme(data)
            }
        }

        resolveIdentity()

        if (forceRefresh > 0 && businessId) {
            refreshTenantData()
        }

        return () => { mounted = false }
    }, [forceRefresh])

    // 🔄 GLOBAL REFRESH Action
    const refreshTenantData = async () => {
        if (!businessId) return
        console.log('🔄 FORCING GLOBAL REFRESH...')

        try {
            const { data: brandingData, error: brandingError } = await supabase
                .from('branding')
                .select('*')
                .eq('business_id', businessId)
                .single()

            if (!brandingError && brandingData) {
                // 📡 DOUBLE-FETCH: Get language from tenants table using venue_name
                // 🛡️ UNIVERSAL CASE FIX: Use .ilike()
                let { data: tenantRow, error: langError } = await supabase
                    .from('tenants')
                    .select('id, language, venue_name, owner_id')
                    .ilike('venue_name', brandingData.slug)
                    .single()

                // 🆘 ULTIMATE FAILSAFE: Fetch by owner ID if slug fails
                if (langError || !tenantRow) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: ownerRow, error: ownerError } = await supabase
                            .from('tenants')
                            .select('id, language, venue_name, owner_id')
                            .eq('owner_id', user.id)
                            .single();

                        if (!ownerError && ownerRow) {
                            tenantRow = ownerRow;
                            langError = null;
                        }
                    }
                }

                if (langError) {
                    console.error("SUPABASE ERROR (Tenants Refresh):", langError.message, langError.details);
                }

                const data = { ...brandingData, id: tenantRow?.id, venue_name: tenantRow?.venue_name, language: tenantRow?.language || 'es' }
                setTenantData(data)
                applyTheme(data)

                if (data.slug) {
                    localStorage.setItem(`tenant_lock_${data.slug}`, JSON.stringify(data))
                }
                console.log('✅ GLOBAL REFRESH COMPLETE')
            }
        } catch (err) {
            console.error('Refresh Failed', err)
        }
    }

    // 🎨 THEME ENGINE
    const applyTheme = (data) => {
        if (!data) return
        const root = document.documentElement.style
        const fontFamily = data.font_family ? `'${data.font_family}', sans-serif` : 'Inter, system-ui, sans-serif'

        root.setProperty('--font-family-brand', fontFamily)
        if (data.primary_color) root.setProperty('--color-primary', data.primary_color)
        if (data.secondary_color) root.setProperty('--color-secondary', data.secondary_color)
        if (data.confirmation_color) root.setProperty('--color-confirm', data.confirmation_color)
        if (data.powered_by_color) root.setProperty('--color-powered', data.powered_by_color)
        if (data.background_color) root.setProperty('--color-bg', data.background_color)

        if (data.service_modes && root && root.classList) {
            if (data.service_modes.dineIn) root.classList.add('mode-dine-in')
            else root.classList.remove('mode-dine-in')
        }
    }

    // PUBLIC API
    const contextValue = {
        businessId,
        tenantData,
        serviceModes: tenantData?.service_modes || { dineIn: true, dineInPayment: 'before', delivery: true, events: true },
        loading,
        error,
        trialExpired,
        emergencyUnblock,
        refreshTenantData,
        forceRefresh,
        isLoaded: !loading
    }

    return (
        <TenantContext.Provider value={contextValue}>
            {children}
        </TenantContext.Provider>
    )
}

// HOOK
export function useTenant() {
    const context = useContext(TenantContext)
    if (!context) {
        return {
            businessId: null, tenantData: {}, loading: false, error: null,
            refreshTenantData: async () => { }, isLoaded: false
        }
    }
    return context
}

// Compatibility Hook
export function useBusinessId() {
    const context = useContext(TenantContext)
    return context?.businessId || null
}
