/**
 * TenantContext.jsx
 * 
 * 🏢 Multi-Tenant Identity Provider
 * 
 * 🛡️ RECOVERY MODE: FORCED BYPASS ACTIVE
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../utils/storage.js'

// Context
const TenantContext = createContext(null)

// 🛡️ Timeout utility
const withTimeout = (promise, ms, errorMessage) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms)
    )
    return Promise.race([promise, timeout])
}

export function TenantProvider({ children }) {
    // 🛡️ ZERO-LATENCY CACHE: Hydrate Synchronously (prevents FOUC)
    const [tenantData, setTenantData] = useState(() => {
        try {
            const pathSegments = window.location.pathname.split('/').filter(Boolean)
            const slug = pathSegments[0]
            if (!slug) return null

            const CACHE_KEY = `tenant_cache_${slug}`
            const cached = localStorage.getItem(CACHE_KEY)

            if (cached) {
                const parsed = JSON.parse(cached)
                console.log('[TenantContext] ⚡ SYNC HYDRATION: Restored Vault', parsed.business_name)
                return parsed
            }
        } catch (e) {
            console.warn('[TenantContext] ⚠️ Sync Hydration Failed', e)
        }
        return null
    })

    const [loading, setLoading] = useState(() => !!tenantData ? false : true) // If hydrated, not loading!
    const [businessId, setBusinessId] = useState(() => tenantData ? tenantData.business_id : null)
    const [trialExpired, setTrialExpired] = useState(false)
    const [error, setError] = useState(null)

    // Emergency Unblock State
    const [emergencyUnblock, setEmergencyUnblock] = useState(false)

    useEffect(() => {
        const resolveTenant = async () => {
            try {
                // If we already hydrated synchronously, we are just revalidating
                const pathSegments = window.location.pathname.split('/').filter(Boolean)
                const slug = pathSegments[0]

                // 🛡️ PROTECTED ROUTES: Skip vault resolution for static paths
                const RESERVED = ['admin', 'owner', 'start-trial', 'login', 'signup', 'camera']
                if (!slug || RESERVED.includes(slug)) {
                    setLoading(false)
                    return
                }

                console.log('[TenantContext] 🔍 Resolving Vault for slug:', slug)

                // 🛡️ THE FIX: Use 'slug' column instead of 'tenant_id'
                const { data, error } = await supabase
                    .from('branding')
                    .select('*')
                    .eq('slug', slug)
                    .single()

                if (error) throw error

                if (data) {
                    // Update State & Cache
                    const CACHE_KEY = `tenant_cache_${slug}`
                    const cached = localStorage.getItem(CACHE_KEY)

                    if (JSON.stringify(data) !== cached) {
                        console.log('[TenantContext] 🔄 REVALIDATION: Updating Cache')
                        localStorage.setItem(CACHE_KEY, JSON.stringify(data))

                        setBusinessId(data.business_id)
                        setTenantData(data)
                        setTenantStoragePrefix(data.business_id)
                        setTrialExpired(false)
                    } else {
                        console.log('[TenantContext] 💤 DATA STABLE')
                    }

                    // Ensure these are set even if data matched cache (for context consumers)
                    if (!businessId) {
                        setBusinessId(data.business_id)
                        setTenantStoragePrefix(data.business_id)
                    }
                }
            } catch (err) {
                console.error('[TenantContext] ❌ Resolution Failed:', err.message)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        resolveTenant()
    }, [])

    // 🎨 THEME HYDRATION ENGINE
    // 🎨 THEME HYDRATION ENGINE
    const applyTheme = (data) => {
        if (!data) return
        const root = document.documentElement.style
        const fontFamily = data.font_family ? `'${data.font_family}', sans-serif` : 'Inter, system-ui, sans-serif'

        console.log('[TenantContext] 🎨 APPLYING THEME:', data.business_name)
        root.setProperty('--font-family-brand', fontFamily)
        if (data.primary_color) root.setProperty('--color-primary', data.primary_color)
        if (data.secondary_color) root.setProperty('--color-secondary', data.secondary_color)
        if (data.confirmation_color) root.setProperty('--color-confirm', data.confirmation_color)
        if (data.powered_by_color) root.setProperty('--color-powered', data.powered_by_color)
        if (data.background_color) root.setProperty('--color-bg', data.background_color)
    }

    useEffect(() => {
        if (!tenantData) return
        applyTheme(tenantData)

        // 🛡️ RESUME REPAIR: Force re-apply on wake
        const handleResume = () => {
            if (document.visibilityState === 'visible') {
                console.log('[TenantContext] ☀️ WAKE DETECTED: Re-applying Theme')
                applyTheme(tenantData)
            }
        }

        document.addEventListener('visibilitychange', handleResume)
        return () => document.removeEventListener('visibilitychange', handleResume)
    }, [tenantData])

    // 🛡️ CACHE SYNC ENGINE: Keep localStorage up-to-date with state changes
    useEffect(() => {
        if (!tenantData || !tenantData.business_id) return

        try {
            const slug = tenantData.slug || window.location.pathname.split('/').filter(Boolean)[0]
            if (!slug) return

            const CACHE_KEY = `tenant_cache_${slug}`
            const currentCache = localStorage.getItem(CACHE_KEY)
            const newData = JSON.stringify(tenantData)

            if (currentCache !== newData) {
                console.log('[TenantContext] 💾 CACHE SYNC: Persisting Latest State')
                localStorage.setItem(CACHE_KEY, newData)
            }
        } catch (e) {
            console.warn('[TenantContext] ⚠️ Cache Sync Failed', e)
        }
    }, [tenantData])

    // Loading Splash
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fff' }}>
                <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    // Error Screen
    if (error && !loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fff', textAlign: 'center' }}>
                <h1>🏢 Negocio no encontrado</h1>
                <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 8 }}>Reintentar</button>
            </div>
        )
    }

    // 🔄 GLOBAL REFRESH: Force re-fetch from Cloud after saves
    const refreshTenantData = async () => {
        if (!businessId) return
        console.log('🔄 FORCING GLOBAL REFRESH...')
        const { data, error } = await supabase
            .from('branding')
            .select('*')
            .eq('business_id', businessId)
            .single()

        if (!error && data) {
            // 🛡️ MIRROR-FIRST REFRESH
            // ⚠️ BLOCKED: Mirror is stale. Bypass.
            /*
            const { data: mirrorData } = await supabase
                .from('menu_view')
                .select('menu_data')
                .eq('business_id', businessId)
                .single()

            if (mirrorData?.menu_data) {
                console.log('[TenantContext] 🪞 REFRESH MIRROR: Updated with Universal Data')
                data.menu_data = mirrorData.menu_data
            }
            */
            console.log('[TenantContext] 🛡️ REFRESH BYPASS: Reading direct from Branding Table')

            setTenantData(data)
            console.log('✅ GLOBAL REFRESH COMPLETE')
        }
    }

    return (
        <TenantContext.Provider value={{
            businessId,
            tenantData,
            trialExpired,
            loading,
            isLoaded: !loading,
            emergencyUnblock,
            forceRefresh: Date.now(),
            refreshTenantData
        }}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (!context) return { businessId: null, tenantData: {}, isLoaded: false, loading: false, forceRefresh: 0, branding: {}, settings: {}, slug: null, refreshTenantData: async () => { } };
    return {
        ...context,
        branding: context.tenantData || {},
        settings: context.tenantData?.settings || {},
        slug: context.tenantData?.slug
    };
}

export function useBusinessId() {
    const context = useContext(TenantContext);
    if (!context) return null;
    return context.businessId;
}
