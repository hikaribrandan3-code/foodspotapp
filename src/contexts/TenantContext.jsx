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
            const { data: brandingData, error: brandingError } = await supabase
                .from('branding')
                .select('*')
                .eq('slug', slug)
                .maybeSingle()

            if (brandingError) {
                throw brandingError;
            }

            if (!brandingData) {
                // Clear stale slug so broken tenants don't poison future loads
                localStorage.removeItem('fs_last_active_slug');
                localStorage.removeItem('fs_business_id');
                throw new Error(`No branding data found for '${slug}'`);
            }

            if (brandingData) {
                // 📡 DOUBLE-FETCH: Get language from tenants table using venue_name (Official Schema)
                // 🛡️ UNIVERSAL CASE FIX: Use .ilike() for case-insensitive matching
                let { data: tenantRow, error: langError } = await supabase
                    .from('tenants')
                    .select('id, language, venue_name, owner_id')
                    .ilike('venue_name', slug)
                    .maybeSingle()

                // 🆘 ULTIMATE FAILSAFE: If venue_name fails, fetch by authenticated owner ID
                if ((langError || !tenantRow) && mounted) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: ownerRow, error: ownerError } = await supabase
                            .from('tenants')
                            .select('id, language, venue_name, owner_id')
                            .eq('owner_id', user.id)
                            .maybeSingle();

                        if (!ownerError && ownerRow) {
                            tenantRow = ownerRow;
                            langError = null;
                        }
                    }
                }

                // MERGE: Ensure we keep the actual tenant PK (id) and venue_name
                // 🛡️ LANGUAGE GUARD: Don't force Spanish on empty DB fields — preserve existing or default to English
                const data = { ...brandingData, id: tenantRow?.id, venue_name: tenantRow?.venue_name, language: tenantRow?.language || tenantData?.language || 'en' }

                if (mounted) {
                    setTenantData(data)
                    setBusinessId(data.business_id)
                    setTenantStoragePrefix(data.business_id)
                    setTrialExpired(false)
                    
                    // 🚀 VAULT-SEAL: Pre-fetch critical images in background
                    const prefetchUrls = extractPrefetchUrls(data)
                    if (prefetchUrls.length > 0) {
                        prefetchImages(prefetchUrls)
                    }
                }

                // UPDATE PERSISTENCE
                localStorage.setItem('fs_last_active_slug', slug)
                localStorage.setItem('fs_business_id', data.business_id)
            }
        }

        resolveIdentity()

        // 📡 REAL-TIME IDENTITY SYNC: Listen for changes to the tenant (language, venue_name, etc.)
        // This ensures the Customer side reacts immediately when the Owner changes settings.
        let tenantChannel = null;
        let brandingChannel = null;

        try {
            tenantChannel = supabase
                .channel('tenant-sync')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'tenants',
                        filter: businessId ? `business_id=eq.${businessId}` : undefined
                    },
                    (payload) => {
                        setTenantData(prev => ({
                            ...prev,
                            ...payload.new,
                            // Ensure ID and venue_name are preserved if payload is partial
                            id: payload.new.id || prev.id,
                            venue_name: payload.new.venue_name || prev.venue_name,
                            language: payload.new.language || prev.language || 'en'
                        }));
                    }
                )
                .subscribe();
        } catch (err) {
            console.warn('[TenantLock] ⚠️ Realtime subscriptions unavailable:', err?.message);
        }

        // 📡 REAL-TIME BRANDING SYNC: Listen for app_config changes (payments, aliases, etc.)
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
                    setTenantData(prev => ({
                        ...prev,
                        app_config: payload.new.app_config || prev.app_config,
                        pickup_enabled: payload.new.pickup_enabled !== undefined ? payload.new.pickup_enabled : prev.pickup_enabled,
                        delivery_enabled: payload.new.delivery_enabled !== undefined ? payload.new.delivery_enabled : prev.delivery_enabled,
                        dine_in_enabled: payload.new.dine_in_enabled !== undefined ? payload.new.dine_in_enabled : prev.dine_in_enabled,
                        dine_in_payment_timing: payload.new.dine_in_payment_timing !== undefined ? payload.new.dine_in_payment_timing : prev.dine_in_payment_timing,
                        // Delivery operational columns (Fix B)
                        delivery_radius: payload.new.delivery_radius !== undefined ? payload.new.delivery_radius : prev.delivery_radius,
                        delivery_radius_km: payload.new.delivery_radius_km !== undefined ? payload.new.delivery_radius_km : prev.delivery_radius_km,
                        delivery_fee: payload.new.delivery_fee !== undefined ? payload.new.delivery_fee : prev.delivery_fee,
                        free_delivery_threshold: payload.new.free_delivery_threshold !== undefined ? payload.new.free_delivery_threshold : prev.free_delivery_threshold,
                        store_lat: payload.new.store_lat !== undefined ? payload.new.store_lat : prev.store_lat,
                        store_lon: payload.new.store_lon !== undefined ? payload.new.store_lon : prev.store_lon,
                        pause_orders: payload.new.pause_orders !== undefined ? payload.new.pause_orders : prev.pause_orders,
                        is_paused: payload.new.is_paused !== undefined ? payload.new.is_paused : prev.is_paused,
                        pause_message: payload.new.pause_message !== undefined ? payload.new.pause_message : prev.pause_message,
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
            if (tenantChannel) supabase.removeChannel(tenantChannel);
            if (brandingChannel) supabase.removeChannel(brandingChannel);
        }
    }, [forceRefresh, businessId])

    // 🔄 GLOBAL REFRESH Action
    const refreshTenantData = async () => {
        if (!businessId) return

        try {
            const { data: brandingData, error: brandingError } = await supabase
                .from('branding')
                .select('*')
                .eq('business_id', businessId)
                .maybeSingle()

            if (brandingError) {
                console.error('[TenantLock] Refresh branding error:', brandingError.message, brandingError.details);
            }

            if (brandingData) {
                // 📡 RELIABLE FETCH: Use known tenant PK first, then fallback to venue_name / owner_id
                let { data: tenantRow, error: langError } = await supabase
                    .from('tenants')
                    .select('id, language, venue_name, owner_id')
                    .eq('id', tenantData?.id)
                    .maybeSingle()

                // 🆘 FALLBACK 1: venue_name match (for edge cases where id is missing)
                if ((langError || !tenantRow) && tenantData?.venue_name) {
                    const venueFallback = await supabase
                        .from('tenants')
                        .select('id, language, venue_name, owner_id')
                        .ilike('venue_name', tenantData.venue_name)
                        .maybeSingle();

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
                            .maybeSingle();

                        if (!ownerError && ownerRow) {
                            tenantRow = ownerRow;
                            langError = null;
                        }
                    }
                }

                // 🛡️ PRESERVE EXISTING LANGUAGE: Only fall back to 'en' if we truly have no data
                const data = {
                    ...brandingData,
                    id: tenantRow?.id ?? tenantData?.id,
                    venue_name: tenantRow?.venue_name ?? tenantData?.venue_name,
                    language: tenantRow?.language ?? tenantData?.language ?? 'en'
                }
                setTenantData(data)
                localStorage.setItem('fs_business_id', data.business_id)
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
