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
    // 🗑️ featuredPhotos system removed — no prefetching needed

    return urls.slice(0, 3) // Max 3 images (hero + menu items)
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

                console.log(`[TenantLock] 🔐 Locking Tenant: ${targetSlug}`)

                // ⚡ MISSION PROTOCOL: DIRECT "UNIVERSAL TRUTH" URL RESOLUTION
                // We bypass volatile local state / polling to prevent Identity collisions
                console.log('[TenantLock] 📡 Fetching Identity directly from Supabase via URL Slug...')
                await revalidate(targetSlug)

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
                localStorage.setItem('fs_last_active_slug', slug)
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
                // 📡 RELIABLE FETCH: Use known tenant PK first, then fallback to venue_name / owner_id
                let { data: tenantRow, error: langError } = await supabase
                    .from('tenants')
                    .select('id, language, venue_name, owner_id')
                    .eq('id', tenantData?.id)
                    .single()

                // 🆘 FALLBACK 1: venue_name match (for edge cases where id is missing)
                if ((langError || !tenantRow) && tenantData?.venue_name) {
                    const venueFallback = await supabase
                        .from('tenants')
                        .select('id, language, venue_name, owner_id')
                        .ilike('venue_name', tenantData.venue_name)
                        .single();

                    if (!venueFallback.error && venueFallback.data) {
                        tenantRow = venueFallback.data;
                        langError = null;
                    }
                }

                // 🆘 FALLBACK 2: Authenticated owner lookup
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

                // 🛡️ PRESERVE EXISTING LANGUAGE: Only fall back to 'es' if we truly have no data
                const data = {
                    ...brandingData,
                    id: tenantRow?.id ?? tenantData?.id,
                    venue_name: tenantRow?.venue_name ?? tenantData?.venue_name,
                    language: tenantRow?.language ?? tenantData?.language ?? 'es'
                }
                setTenantData(data)
                console.log('✅ GLOBAL REFRESH COMPLETE')
            }
        } catch (err) {
            console.error('Refresh Failed', err)
        }
    }

    // 🎨 THEME ENGINE EXTRACTED to ThemeHydrator in App.jsx

    // PUBLIC API
    const contextValue = {
        businessId,
        tenantData,
        serviceModes: tenantData?.app_config?.service_modes || tenantData?.service_modes || {
            pickup: true,
            delivery: true,
            dineIn: false,
            dineInPayment: 'after',
            events: false
        },
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
