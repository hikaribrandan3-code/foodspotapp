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
    'status', 'checkout', 'order', 'auth'
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
                    setLoading(false)
                    return
                }

                // ⚡ MISSION PROTOCOL: DIRECT "UNIVERSAL TRUTH" URL RESOLUTION
                // We bypass volatile local state / polling to prevent Identity collisions
                await revalidate(targetSlug)

            } catch (err) {
                console.error('[TenantLock] 💥 Critical Failure:', err)
                if (mounted) setError(err.message)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        const revalidate = async (slug) => {
            // 🎯 FETCH BRANDING: Get all tenant configuration from branding table
            // We also fetch the language from businesses table for the complete picture
            const { data: brandingData, error: brandingError } = await supabase
                .from('branding')
                .select('*')
                .eq('slug', slug)
                .maybeSingle()

            if (brandingError) {
                throw brandingError;
            }

            if (!brandingData) {
                localStorage.removeItem('fs_last_active_slug');
                localStorage.removeItem('fs_business_id');
                throw new Error(`No branding data found for '${slug}'`);
            }

            // 🔗 FETCH LANGUAGE: Get language from businesses table
            let language = 'en'; // default
            try {
                const { data: businessData } = await supabase
                    .from('businesses')
                    .select('language')
                    .eq('id', brandingData.business_id)
                    .maybeSingle();

                if (businessData?.language) {
                    language = businessData.language;
                }
            } catch (err) {
                console.warn('[TenantLock] Could not fetch language:', err?.message);
            }

            if (mounted) {
                const configData = { ...brandingData, language };
                setTenantData(configData)
                setBusinessId(configData.business_id)
                setTenantStoragePrefix(configData.business_id)
                setTrialExpired(false)

                // 🚀 Pre-fetch critical images in background
                const prefetchUrls = extractPrefetchUrls(configData)
                if (prefetchUrls.length > 0) {
                    prefetchImages(prefetchUrls)
                }
            }

            // UPDATE PERSISTENCE
            localStorage.setItem('fs_last_active_slug', slug)
            localStorage.setItem('fs_business_id', brandingData.business_id)
        }

        resolveIdentity()

        // 📡 REAL-TIME LANGUAGE SYNC: Listen for language changes (now in businesses table)
        let businessesChannel = null;
        let brandingChannel = null;

        try {
            businessesChannel = supabase
                .channel('businesses-sync')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'businesses',
                        filter: businessId ? `id=eq.${businessId}` : undefined
                    },
                    (payload) => {
                        setTenantData(prev => ({
                            ...prev,
                            language: payload.new.language || prev.language || 'en'
                        }));
                    }
                )
                .subscribe();
        } catch (err) {
            console.warn('[TenantLock] ⚠️ Businesses realtime unavailable:', err?.message);
        }

        // 📡 REAL-TIME BRANDING SYNC: Listen for app_config & service modes changes
        try {
            brandingChannel = supabase
                .channel('branding-sync')
                .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'branding',
                    filter: businessId ? `business_id=eq.${businessId}` : undefined
                },
                (payload) => {
                    // 🔄 MERGE: Update tenantData with all fields from the branding UPDATE payload
                    // Use ternary for optional fields, spread for complete fields like app_config
                    setTenantData(prev => ({
                        ...prev,
                        // Identity & Typography
                        business_name: payload.new.business_name !== undefined ? payload.new.business_name : prev.business_name,
                        font_family: payload.new.font_family !== undefined ? payload.new.font_family : prev.font_family,
                        font_weight: payload.new.font_weight !== undefined ? payload.new.font_weight : prev.font_weight,

                        // Theme Colors
                        navbar_color: payload.new.navbar_color !== undefined ? payload.new.navbar_color : prev.navbar_color,
                        confirmation_color: payload.new.confirmation_color !== undefined ? payload.new.confirmation_color : prev.confirmation_color,
                        powered_by_color: payload.new.powered_by_color !== undefined ? payload.new.powered_by_color : prev.powered_by_color,

                        // Hero Configuration
                        hero_mode: payload.new.hero_mode !== undefined ? payload.new.hero_mode : prev.hero_mode,
                        hero_url: payload.new.hero_url !== undefined ? payload.new.hero_url : prev.hero_url,
                        hero_cover_image: payload.new.hero_cover_image !== undefined ? payload.new.hero_cover_image : prev.hero_cover_image,
                        hero_cover_image_uploaded_at: payload.new.hero_cover_image_uploaded_at !== undefined ? payload.new.hero_cover_image_uploaded_at : prev.hero_cover_image_uploaded_at,
                        nav_icon_mode: payload.new.nav_icon_mode !== undefined ? payload.new.nav_icon_mode : prev.nav_icon_mode,
                        hero_icon_mode: payload.new.hero_icon_mode !== undefined ? payload.new.hero_icon_mode : prev.hero_icon_mode,
                        hero_icons: payload.new.hero_icons !== undefined ? payload.new.hero_icons : prev.hero_icons,
                        info_pills: payload.new.info_pills !== undefined ? payload.new.info_pills : prev.info_pills,

                        // Service Modes (flat columns)
                        pickup_enabled: payload.new.pickup_enabled !== undefined ? payload.new.pickup_enabled : prev.pickup_enabled,
                        delivery_enabled: payload.new.delivery_enabled !== undefined ? payload.new.delivery_enabled : prev.delivery_enabled,
                        dine_in_enabled: payload.new.dine_in_enabled !== undefined ? payload.new.dine_in_enabled : prev.dine_in_enabled,
                        dine_in_payment_timing: payload.new.dine_in_payment_timing !== undefined ? payload.new.dine_in_payment_timing : prev.dine_in_payment_timing,

                        // Delivery Configuration
                        delivery_radius: payload.new.delivery_radius !== undefined ? payload.new.delivery_radius : prev.delivery_radius,
                        delivery_radius_km: payload.new.delivery_radius_km !== undefined ? payload.new.delivery_radius_km : prev.delivery_radius_km,
                        delivery_fee: payload.new.delivery_fee !== undefined ? payload.new.delivery_fee : prev.delivery_fee,
                        free_delivery_threshold: payload.new.free_delivery_threshold !== undefined ? payload.new.free_delivery_threshold : prev.free_delivery_threshold,
                        store_lat: payload.new.store_lat !== undefined ? payload.new.store_lat : prev.store_lat,
                        store_lon: payload.new.store_lon !== undefined ? payload.new.store_lon : prev.store_lon,

                        // Order Control
                        pause_orders: payload.new.pause_orders !== undefined ? payload.new.pause_orders : prev.pause_orders,
                        is_paused: payload.new.is_paused !== undefined ? payload.new.is_paused : prev.is_paused,
                        pause_message: payload.new.pause_message !== undefined ? payload.new.pause_message : prev.pause_message,

                        // App Configuration (JSONB - new features, settings, etc.)
                        app_config: payload.new.app_config || prev.app_config,

                        // Menu Data (JSONB)
                        menu_data: payload.new.menu_data !== undefined ? payload.new.menu_data : prev.menu_data,
                    }));
                }
            )
            .subscribe();
        } catch (err) {
            console.warn('[TenantLock] ⚠️ Branding realtime unavailable:', err?.message);
        }

        // 📡 FRONTEND SYNC EVENT LISTENER: Catch Settings saves instantly (no real-time delay)
        // This ensures cameraPinStyle and other app_config changes update tenantData immediately
        const handleFrontendSync = (e) => {
            const syncData = e.detail;
            if (syncData) {
                // CRITICAL: Merge app_config first, then other branding/colors fields
                const updatedData = {
                    ...tenantData,
                    ...syncData,
                };
                // EXPLICIT: Ensure app_config overwrites completely (not shallow merge)
                if (syncData.app_config) {
                    updatedData.app_config = {
                        ...(tenantData?.app_config || {}),
                        ...syncData.app_config
                    };
                }
                setTenantData(updatedData);
            }
        };
        window.addEventListener('frontendSync', handleFrontendSync);

        if (forceRefresh > 0 && businessId) {
            refreshTenantData()
        }

        return () => {
            mounted = false;
            window.removeEventListener('frontendSync', handleFrontendSync);
            if (businessesChannel) supabase.removeChannel(businessesChannel);
            if (brandingChannel) supabase.removeChannel(brandingChannel);
        }
    }, [forceRefresh, businessId])

    // 🔄 GLOBAL REFRESH: Fetch fresh config from branding table
    const refreshTenantData = async () => {
        if (!businessId) return

        try {
            const { data: brandingData, error: brandingError } = await supabase
                .from('branding')
                .select('*')
                .eq('business_id', businessId)
                .maybeSingle()

            if (brandingError) {
                console.error('[TenantLock] Refresh error:', brandingError.message, brandingError.details);
                return;
            }

            if (brandingData) {
                // 🔗 FETCH LANGUAGE: Get latest language from businesses table
                let language = tenantData?.language || 'en';
                try {
                    const { data: businessData } = await supabase
                        .from('businesses')
                        .select('language')
                        .eq('id', businessId)
                        .maybeSingle();

                    if (businessData?.language) {
                        language = businessData.language;
                    }
                } catch (err) {
                    console.warn('[TenantLock] Could not fetch language on refresh:', err?.message);
                }

                const configData = { ...brandingData, language };
                setTenantData(configData)
                localStorage.setItem('fs_business_id', configData.business_id)
            }
        } catch (err) {
            console.error('[TenantLock] Refresh failed:', err)
        }
    }

    // 🎨 THEME ENGINE EXTRACTED to ThemeHydrator in App.jsx

    // PUBLIC API
    const contextValue = {
        businessId,
        tenantData,
        serviceModes: (() => {
            // NEW: Read from flat columns (source of truth post-migration)
            const fromFlat = tenantData?.pickup_enabled !== undefined ? {
                pickup: tenantData.pickup_enabled,
                delivery: tenantData.delivery_enabled,
                dineIn: tenantData.dine_in_enabled,
                dineInPayment: tenantData.dine_in_payment_timing || 'after'
            } : null;
            // FALLBACK: Read from app_config JSONB (pre-migration rows)
            const fromJsonb = tenantData?.app_config?.service_modes || tenantData?.service_modes || null;
            return fromFlat || fromJsonb || {
                pickup: true,
                delivery: true,
                dineIn: false,
                dineInPayment: 'after'
            };
        })(),
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
